"""
app/api/voice.py — REST endpoints for Text-to-Speech (TTS) and Speech-to-Text (STT).

Endpoints:
- POST /api/voice/tts: Synthesizes narration text using Gemini 3.8 Flash TTS.
- POST /api/voice/stt: Transcribes recorded audio using Groq Whisper Large v3 Turbo.
"""
from __future__ import annotations

import base64
import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel, Field

from app.config import get_settings
from app.voice.normalizer import normalize_for_tts
from app.voice.stt.groq_whisper import DEFAULT_TANG_VOCAB_HINT, SUPPORTED_AUDIO_EXTENSIONS, GroqWhisperSTT
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


# ---------------------------------------------------------------------------
# TTS: Text-to-Speech
# ---------------------------------------------------------------------------

@router.post("/tts", summary="Synthesize speech from lesson narration text")
async def text_to_speech(
    req: TTSRequest,
    format: str = Query("audio", description="Response format: 'audio' (binary) or 'json'"),
) -> Response:
    """
    Synthesize lesson narration text using Gemini 3.8 Flash TTS.
    Returns playable audio bytes (default) or base64 JSON payload.
    """
    cleaned_text = normalize_for_tts(req.text).strip()
    if not cleaned_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Narration text contains no pronounceable content",
        )

    settings = get_settings()
    if not settings.gemini_api_key:
        # Check if fallback edge-tts is available or fail cleanly with 503
        if not settings.voice_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Voice service is disabled",
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini TTS service is not configured (missing API key)",
        )

    provider = GeminiTTSProvider(
        api_key=settings.gemini_api_key,
        model=settings.bookey_tts_model,
        default_voice=settings.bookey_tts_voice,
        style=settings.bookey_tts_style,
    )

    try:
        result = await provider.synthesize(
            text=cleaned_text,
            voice=req.voice or "",
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

    if format == "json":
        json_data = TTSResponseJSON(
            audio_base64=base64.b64encode(result.audio_bytes).decode("ascii"),
            mime_type=result.mime_type,
            duration_ms=result.duration_ms,
        )
        return Response(content=json_data.model_dump_json(), media_type="application/json")

    return Response(
        content=result.audio_bytes,
        media_type=result.mime_type,
        headers={
            "Content-Disposition": "inline; filename=speech.wav",
            "Cache-Control": "public, max-age=3600",
        },
    )


# ---------------------------------------------------------------------------
# STT: Speech-to-Text
# ---------------------------------------------------------------------------

@router.post("/stt", response_model=STTResponse, summary="Transcribe question audio recording")
async def speech_to_text(
    file: UploadFile = File(..., description="Recorded audio file"),
    language: str | None = Form(default=None, description="Optional BCP-47 language hint, e.g. 'ta' or 'en'"),
) -> STTResponse:
    """
    Transcribes audio using Groq Whisper Large v3 Turbo with Tanglish vocabulary hints.
    """
    settings = get_settings()
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Speech-to-text service is not configured (missing Groq API key)",
        )

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
    stt_provider = GroqWhisperSTT(
        api_key=settings.groq_api_key,
        model=settings.bookey_stt_model or settings.groq_whisper_model,
        vocab_hint=DEFAULT_TANG_VOCAB_HINT,
    )

    try:
        result = await stt_provider.transcribe(
            audio_bytes=audio_bytes,
            mime=mime,
            hint_lang=language,
        )
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
        transcript=result.transcript,
        language=result.language,
        duration_s=result.duration_s,
    )
