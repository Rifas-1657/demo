"""
app/api/voice.py — REST endpoints for Text-to-Speech (TTS) and Speech-to-Text (STT).

Endpoints:
- POST /api/voice/tts: Synthesizes narration text using cached Bodhan Indic-Speak (or Gemini) TTS.
- POST /api/voice/stt: Transcribes recorded audio using local faster-whisper (or Groq Whisper).
"""
from __future__ import annotations

import base64
import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel, Field

from app.config import get_settings
from app.voice.cache import (
    compute_voice_cache_key,
    get_key_lock,
    get_voice_cache,
    set_voice_cache,
)
from app.voice.normalizer import normalize_for_tts
from app.voice.stt.faster_whisper import FasterWhisperSTT
from app.voice.stt.groq_whisper import DEFAULT_TANG_VOCAB_HINT, SUPPORTED_AUDIO_EXTENSIONS, GroqWhisperSTT
from app.voice.tts.bodhan_tts import BodhanTTSProvider
from app.voice.tts.gemini_tts import GeminiTTSProvider

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])

MAX_TTS_TEXT_LENGTH = 5000
MAX_STT_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB


class TTSRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=MAX_TTS_TEXT_LENGTH,
        description="Narration text to synthesize",
    )
    voice: str | None = Field(default=None, description="Optional voice identifier")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Playback speed (0.5 - 2.0)")


class TTSResponseJSON(BaseModel):
    audio_base64: str
    mime_type: str
    duration_ms: int


class STTResponse(BaseModel):
    transcript: str
    language: str
    duration_s: float
    raw_text: str | None = Field(default=None, description="Original uncorrected transcript")
    correction_applied: bool = Field(default=False, description="Whether LLM correction was applied")
    provider: str = Field(default="local", description="STT provider used")
    confidence: float | None = Field(default=None, description="Transcription confidence (0-1)")


# ---------------------------------------------------------------------------
# TTS: Text-to-Speech
# ---------------------------------------------------------------------------

@router.post("/tts", summary="Synthesize speech from lesson narration text")
async def text_to_speech(
    req: TTSRequest,
    format: str = Query("audio", description="Response format: 'audio' (binary) or 'json'"),
) -> Response:
    """
    Synthesize lesson narration text.
    Checks persistent disk cache first (0 API calls on cache hit).
    On cache miss, synthesizes via Bodhan Indic-Speak (or Gemini) and caches atomically.
    """
    cleaned_text = normalize_for_tts(req.text).strip()
    if not cleaned_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Narration text contains no pronounceable content",
        )

    settings = get_settings()
    provider_name = settings.tts_provider.lower()

    # Determine provider parameters for cache key computation
    if provider_name == "bodhan":
        model = settings.bodhan_tts_model
        voice = req.voice or settings.bodhan_tts_voice
        lang = settings.bodhan_tts_lang
        style = settings.bodhan_tts_style
    elif provider_name == "gemini":
        model = settings.bookey_tts_model
        voice = req.voice or settings.bookey_tts_voice
        lang = "ta"
        style = settings.bookey_tts_style
    else:
        model = "edge"
        voice = req.voice or settings.edge_tts_voice
        lang = "ta"
        style = "default"

    cache_key = compute_voice_cache_key(
        text=cleaned_text,
        model=model,
        voice=voice,
        lang=lang,
        style=style,
        speed=req.speed,
    )

    # 1. Fast path: check persistent cache
    cached = get_voice_cache(cache_key)
    if cached is not None:
        audio_bytes, meta = cached
        mime_type = meta.get("mime_type", "audio/wav")
        duration_ms = meta.get("duration_ms", 0)

        if format == "json":
            json_data = TTSResponseJSON(
                audio_base64=base64.b64encode(audio_bytes).decode("ascii"),
                mime_type=mime_type,
                duration_ms=duration_ms,
            )
            return Response(
                content=json_data.model_dump_json(),
                media_type="application/json",
                headers={"X-Cache": "HIT"},
            )

        return Response(
            content=audio_bytes,
            media_type=mime_type,
            headers={
                "Content-Disposition": "inline; filename=speech.wav",
                "Cache-Control": "public, max-age=86400",
                "X-Cache": "HIT",
            },
        )

    # 2. Slow path: Acquire per-key lock to coordinate concurrent requests for same audio
    lock = await get_key_lock(cache_key)
    async with lock:
        # Re-check cache in case another request populated it while waiting
        cached = get_voice_cache(cache_key)
        if cached is not None:
            audio_bytes, meta = cached
            mime_type = meta.get("mime_type", "audio/wav")
            duration_ms = meta.get("duration_ms", 0)

            if format == "json":
                json_data = TTSResponseJSON(
                    audio_base64=base64.b64encode(audio_bytes).decode("ascii"),
                    mime_type=mime_type,
                    duration_ms=duration_ms,
                )
                return Response(
                    content=json_data.model_dump_json(),
                    media_type="application/json",
                    headers={"X-Cache": "HIT"},
                )

            return Response(
                content=audio_bytes,
                media_type=mime_type,
                headers={
                    "Content-Disposition": "inline; filename=speech.wav",
                    "Cache-Control": "public, max-age=86400",
                    "X-Cache": "HIT",
                },
            )

        # Synthesize via provider
        if not settings.voice_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Voice service is disabled",
            )

        if provider_name == "bodhan":
            if not settings.bodhan_api_key:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Bodhan TTS service is not configured (missing BODHAN_API_KEY)",
                )
            provider = BodhanTTSProvider(
                api_key=settings.bodhan_api_key,
                model=model,
                default_voice=voice,
                lang=lang,
                style=style,
            )
        elif provider_name == "gemini":
            if not settings.gemini_api_key:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Gemini TTS service is not configured (missing API key)",
                )
            provider = GeminiTTSProvider(
                api_key=settings.gemini_api_key,
                model=model,
                default_voice=voice,
                style=style,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"TTS provider '{provider_name}' is not configured",
            )

        try:
            result = await provider.synthesize(
                text=cleaned_text,
                voice=voice,
                speed=req.speed,
            )
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
        except (TimeoutError, httpx.TimeoutException):
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="TTS provider request timed out",
            )
        except Exception as exc:
            err_msg = str(exc)
            if "429" in err_msg or "rate limit" in err_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="TTS provider rate limit reached. Please retry in a few moments.",
                )
            log.warning("TTS generation failure: %s", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Speech synthesis upstream provider error",
            )

        # Store to persistent cache
        set_voice_cache(
            key=cache_key,
            audio_bytes=result.audio_bytes,
            metadata={
                "text": cleaned_text,
                "model": model,
                "voice": voice,
                "lang": lang,
                "style": style,
                "speed": req.speed,
                "duration_ms": result.duration_ms,
                "mime_type": result.mime_type,
                "timings": [
                    {"word": wt.word, "startMs": wt.start_ms, "endMs": wt.end_ms}
                    for wt in result.word_timings
                ],
            },
        )

        if format == "json":
            json_data = TTSResponseJSON(
                audio_base64=base64.b64encode(result.audio_bytes).decode("ascii"),
                mime_type=result.mime_type,
                duration_ms=result.duration_ms,
            )
            return Response(
                content=json_data.model_dump_json(),
                media_type="application/json",
                headers={"X-Cache": "MISS"},
            )

        return Response(
            content=result.audio_bytes,
            media_type=result.mime_type,
            headers={
                "Content-Disposition": "inline; filename=speech.wav",
                "Cache-Control": "public, max-age=86400",
                "X-Cache": "MISS",
            },
        )


# ---------------------------------------------------------------------------
# STT: Speech-to-Text
# ---------------------------------------------------------------------------

@router.post("/stt", response_model=STTResponse, summary="Transcribe question audio recording")
async def speech_to_text(
    file: UploadFile = File(..., description="Recorded audio file"),
    language: str | None = Form(default=None, description="Optional BCP-47 language hint, e.g. 'ta' or 'en'"),
    page_title: str | None = Form(default=None, description="Current page/lesson title for context"),
    page_keywords: str | None = Form(default=None, description="Comma-separated key terms from current page"),
) -> STTResponse:
    """
    Transcribes audio using local faster-whisper (default) or Groq Whisper.
    
    Supports:
    - Context-aware prompts (page_title, page_keywords)
    - Optional LLM post-correction for Python terms
    """
    settings = get_settings()

    # Validate file extension / format
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
    is_valid_format = (
        ext in SUPPORTED_AUDIO_EXTENSIONS
        or any(sub in content_type for sub in ["audio/", "video/webm", "ogg", "wav", "mp4"])
    )
    if not is_valid_format:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported audio format. Supported: {', '.join(sorted(SUPPORTED_AUDIO_EXTENSIONS))}",
        )

    # Read and enforce max size limit
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty",
        )

    if len(audio_bytes) > MAX_STT_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Audio file exceeds {MAX_STT_AUDIO_BYTES // (1024 * 1024)}MB limit",
        )

    mime = content_type or f"audio/{ext}" if ext else "audio/webm"
    provider_name = settings.stt_provider.lower()

    if provider_name == "local":
        stt_provider = FasterWhisperSTT(
            model_name=settings.faster_whisper_model,
            compute_type=settings.faster_whisper_compute_type,
            vad_filter=settings.stt_vad_filter,
            beam_size=settings.stt_beam_size,
            temperature=settings.stt_temperature,
            no_speech_threshold=settings.stt_no_speech_threshold,
            compression_ratio_threshold=settings.stt_compression_ratio_threshold,
            log_prob_threshold=settings.stt_log_prob_threshold,
        )
    elif provider_name == "groq":
        if not settings.groq_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Speech-to-text service is not configured (missing Groq API key)",
            )
        stt_provider = GroqWhisperSTT(
            api_key=settings.groq_api_key,
            model=settings.bookey_stt_model or settings.groq_whisper_model,
            vocab_hint=DEFAULT_TANG_VOCAB_HINT,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"STT provider '{provider_name}' is not configured",
        )

    try:
        # Parse page keywords
        keywords_list = None
        if page_keywords:
            keywords_list = [k.strip() for k in page_keywords.split(",") if k.strip()]
        
        # Transcribe with context
        result = await stt_provider.transcribe(
            audio_bytes=audio_bytes,
            mime=mime,
            hint_lang=language,
            page_title=page_title,
            page_keywords=keywords_list,
        )
        
        # Apply LLM correction if enabled
        raw_transcript = result.transcript
        corrected_transcript = raw_transcript
        correction_applied = False
        
        if settings.stt_correction_enabled and raw_transcript:
            try:
                from app.voice.stt.corrector import TranscriptCorrector
                
                corrector = TranscriptCorrector(provider=settings.stt_correction_provider)
                
                if corrector.is_available():
                    corrected_transcript, correction_applied = await corrector.correct(
                        transcript=raw_transcript,
                        page_title=page_title,
                        page_keywords=keywords_list,
                    )
                else:
                    log.warning("Transcript corrector not available, skipping correction")
            except Exception as exc:
                log.warning("Transcript correction failed: %s", exc)
                # Keep original transcript on correction failure
        
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except (TimeoutError, httpx.TimeoutException):
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="STT provider request timed out",
        )
    except Exception as exc:
        err_msg = str(exc)
        if "429" in err_msg or "rate limit" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="STT provider rate limit reached. Please retry in a few moments.",
            )
        log.warning("STT transcription failure: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Speech-to-text upstream provider error",
        )

    return STTResponse(
        transcript=corrected_transcript,
        language=result.language,
        duration_s=result.duration_s,
        raw_text=raw_transcript if correction_applied else None,
        correction_applied=correction_applied,
        provider=provider_name,
        confidence=result.confidence if hasattr(result, "confidence") else None,
    )
