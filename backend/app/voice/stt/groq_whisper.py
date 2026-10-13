"""
app/voice/stt/groq_whisper.py  — Groq Whisper STT provider.

Env: GROQ_API_KEY, GROQ_WHISPER_MODEL (default: whisper-large-v3-turbo)
"""
from __future__ import annotations

import io
import time

import httpx

from app.voice import SpeechToText, STTResult


DEFAULT_TANG_VOCAB_HINT = (
    "React, useState, Python, FastAPI, LangGraph, RAG, embeddings, vector database, API, StateGraph"
)

SUPPORTED_AUDIO_EXTENSIONS = {"webm", "mp3", "wav", "ogg", "m4a", "flac", "mp4"}


class GroqWhisperSTT(SpeechToText):
    name = "groq_whisper"
    _URL = "https://api.groq.com/openai/v1/audio/transcriptions"

    def __init__(
        self,
        api_key: str,
        model: str = "whisper-large-v3-turbo",
        vocab_hint: str = DEFAULT_TANG_VOCAB_HINT,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._vocab_hint = vocab_hint

    async def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        hint_lang: str | None = None,
    ) -> STTResult:
        if not self._api_key:
            raise ValueError("GROQ_API_KEY is not configured")

        if not audio_bytes:
            raise ValueError("Audio data is empty")

        if len(audio_bytes) > self.MAX_BYTES:
            raise ValueError(f"Audio too large: {len(audio_bytes)} bytes (max {self.MAX_BYTES})")

        ext = "webm"
        if "wav" in mime:
            ext = "wav"
        elif "ogg" in mime:
            ext = "ogg"
        elif "mp4" in mime or "m4a" in mime:
            ext = "m4a"
        elif "mp3" in mime or "mpeg" in mime:
            ext = "mp3"

        data: dict[str, str] = {
            "model": self._model,
            "response_format": "verbose_json",
        }
        if hint_lang:
            data["language"] = hint_lang
        if self._vocab_hint:
            data["prompt"] = self._vocab_hint

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self._URL,
                headers={"Authorization": f"Bearer {self._api_key}"},
                files={"file": (f"audio.{ext}", audio_bytes, mime)},
                data=data,
            )

        if resp.status_code == 429:
            raise RuntimeError(f"Groq Whisper rate limited (429): {resp.text[:200]}")
        if resp.status_code != 200:
            raise RuntimeError(f"Groq Whisper error ({resp.status_code}): {resp.text[:200]}")

        res_data = resp.json()
        return STTResult(
            transcript=res_data.get("text", "").strip(),
            language=res_data.get("language", hint_lang or "ta"),
            duration_s=float(res_data.get("duration", 0.0)),
        )
