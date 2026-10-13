"""
app/voice/pipeline.py

Voice pipeline entry points:

handle_audio_in(session_id, audio_bytes, mime, user_id, ws_send)
  → STT → question_received event → tutor feed

synthesize_segment(text, voice, speed) → TTSResult (with cache)
  → primary TTS → fallback edge_tts → fallback silent
  → cache write
  → yields audio_chunk WS events (seq-numbered)

pre_synthesize_page(page: GeneratedPage, voice, speed)
  → synthesize each narration segment and cache them
  → called after page generation (B3 worker)
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from typing import TYPE_CHECKING, AsyncIterator

if TYPE_CHECKING:
    from app.voice import SpeechToText, TTSResult


log = logging.getLogger(__name__)

_METRICS: list[dict] = []


def _record(name: str, value_ms: float) -> None:
    _METRICS.append({"metric": name, "value_ms": value_ms, "t": time.time()})
    log.debug("voice_metric %s=%.0fms", name, value_ms)


async def get_stt() -> "SpeechToText":
    from app.config import get_settings
    s = get_settings()
    if s.groq_api_key:
        from app.voice.stt.groq_whisper import GroqWhisperSTT
        return GroqWhisperSTT(api_key=s.groq_api_key, model=s.groq_whisper_model)
    from app.voice.stt.faster_whisper import FasterWhisperSTT
    return FasterWhisperSTT(model_name=s.faster_whisper_model)


def get_tts_chain():
    """Return ordered list of TTS providers."""
    from app.config import get_settings
    s = get_settings()
    providers = []
    from app.voice.tts.edge_tts_provider import EdgeTTSProvider
    providers.append(EdgeTTSProvider(voice=s.edge_tts_voice))
    from app.voice.tts.silent import SilentTTS
    providers.append(SilentTTS())
    return providers


async def synthesize_segment(
    text: str,
    voice: str = "",
    speed: float = 1.0,
) -> "TTSResult":
    """
    Synthesize *text* with caching and provider fallback.
    Returns TTSResult with audio_bytes + word_timings + from_cache flag.
    """
    from app.config import get_settings
    from app.voice import TTSResult
    from app.voice.cache import cache_get, cache_set
    from app.voice.normalizer import normalize_for_tts

    s = get_settings()
    v = voice or s.edge_tts_voice
    normalized = normalize_for_tts(text)

    # Cache lookup
    cached = cache_get(normalized, v, speed)
    if cached:
        audio_bytes, timings, mime = cached
        return TTSResult(
            audio_bytes=audio_bytes,
            mime_type=mime,
            word_timings=[],  # reconstructed from timings below
            duration_ms=timings[-1]["endMs"] if timings else 0,
            provider="cache",
            from_cache=True,
        )

    # Synthesize with fallback chain
    t0 = time.monotonic()
    for provider in get_tts_chain():
        try:
            result = await provider.synthesize(normalized, voice=v, speed=speed)
            latency = (time.monotonic() - t0) * 1000
            _record("tts_latency_ms", latency)
            log.info("TTS %s: %d bytes, %dms, provider=%s",
                     v, len(result.audio_bytes), result.duration_ms, result.provider)
            # Write to cache
            timings_dicts = [{"word": wt.word, "startMs": wt.start_ms, "endMs": wt.end_ms}
                             for wt in result.word_timings]
            cache_set(normalized, v, speed, result.audio_bytes, timings_dicts, result.mime_type)
            return result
        except Exception as exc:
            log.warning("TTS provider %s failed: %s", provider.name, exc)

    # All failed — silent fallback (guaranteed by SilentTTS at end of chain)
    from app.voice.tts.silent import SilentTTS
    return await SilentTTS().synthesize(normalized, voice=v, speed=speed)


async def handle_audio_in(
    session_id: str,
    audio_bytes: bytes,
    mime: str,
    user_id: str,
    course_id: str,
    chapter: int,
    page: int,
    ws_send,  # callable: async (dict) -> None
    narration_active: bool = False,
    llm_router=None,
) -> None:
    """
    Handle an audio_in frame:
      1. STT transcription
      2. Emit question_received WS event (source=voice)
      3. If narration active, queue; else immediately feed into tutor
    """
    t0 = time.monotonic()
    try:
        stt = await get_stt()
        result = await stt.transcribe(audio_bytes, mime)
        stt_latency = (time.monotonic() - t0) * 1000
        _record("stt_latency_ms", stt_latency)
        log.info("STT %s: %r lang=%s dur=%.1fs", stt.name, result.transcript, result.language, result.duration_s)
    except ValueError as exc:
        await ws_send({"type": "error", "message": f"Audio rejected: {exc}"})
        return
    except Exception as exc:
        log.error("STT failed: %s", exc)
        await ws_send({"type": "error", "message": "Speech recognition failed. Please try text input."})
        return

    if not result.transcript.strip():
        await ws_send({"type": "error", "message": "Unrecognised audio. Please speak clearly."})
        return

    # Emit question_received (voice source) — same event as text Q&A
    await ws_send({
        "type": "question_received",
        "question": result.transcript,
        "source": "voice",
        "sessionId": session_id,
    })


async def emit_audio_chunks(
    result: "TTSResult",
    ws_send,
    seq_start: int = 0,
) -> AsyncIterator[dict]:
    """
    Chunk audio bytes into ~4KB frames and emit as audio_chunk WS events.
    Each chunk carries its sequence number for ordering.
    """
    CHUNK_SIZE = 4096
    audio = result.audio_bytes
    seq = seq_start
    for i in range(0, len(audio), CHUNK_SIZE):
        chunk = audio[i:i + CHUNK_SIZE]
        payload = {
            "type": "audio_chunk",
            "seq": seq,
            "data": base64.b64encode(chunk).decode(),
            "mime": result.mime_type,
            "final": (i + CHUNK_SIZE) >= len(audio),
        }
        # Attach timing for first chunk
        if seq == seq_start:
            payload["wordTimings"] = [
                {"word": wt.word, "startMs": wt.start_ms, "endMs": wt.end_ms}
                for wt in result.word_timings
            ]
        await ws_send(payload)
        seq += 1
        await asyncio.sleep(0)
    return seq


def get_metrics() -> list[dict]:
    return list(_METRICS)
