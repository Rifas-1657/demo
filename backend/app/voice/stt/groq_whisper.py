"""
app/voice/stt/groq_whisper.py  — Groq Whisper STT provider.

Env: GROQ_API_KEY, GROQ_WHISPER_MODEL (default: whisper-large-v3-turbo)
"""
from __future__ import annotations

import io
import time

import httpx

from app.voice import SpeechToText, STTResult


class GroqWhisperSTT(SpeechToText):
    name = "groq_whisper"
    _URL = "https://api.groq.com/openai/v1/audio/transcriptions"

    def __init__(self, api_key: str, model: str = "whisper-large-v3-turbo") -> None:
        self._api_key = api_key
        self._model = model

    async def transcribe(self, audio_bytes: bytes, mime: str, hint_lang: str = "ta") -> STTResult:
        if len(audio_bytes) > self.MAX_BYTES:
            raise ValueError(f"Audio too large: {len(audio_bytes)} bytes (max {self.MAX_BYTES})")

        # Estimate duration from size (rough: webm/opus ~16kbps)
        est_duration = len(audio_bytes) / 2000
        if est_duration > self.MAX_DURATION_S:
            raise ValueError(f"Audio likely exceeds {self.MAX_DURATION_S}s limit")

        ext = "webm" if "webm" in mime else "mp3"
        t0 = time.monotonic()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self._URL,
                headers={"Authorization": f"Bearer {self._api_key}"},
                files={"file": (f"audio.{ext}", audio_bytes, mime)},
                data={"model": self._model, "language": hint_lang, "response_format": "verbose_json"},
            )
        if resp.status_code != 200:
            raise RuntimeError(f"Groq Whisper {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        return STTResult(
            transcript=data.get("text", "").strip(),
            language=data.get("language", hint_lang),
            duration_s=data.get("duration", 0.0),
        )
