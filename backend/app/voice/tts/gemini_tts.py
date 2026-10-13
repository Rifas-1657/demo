"""
app/voice/tts/gemini_tts.py — Gemini 3.8 Flash TTS provider.

Model: gemini-3.8-flash-tts (configurable via BOOKEY_TTS_MODEL)
Voices: Puck, Charon, Kore, Fenrir, Aoede (configurable via BOOKEY_TTS_VOICE)
"""
from __future__ import annotations

import base64
import logging
import struct
import time
from typing import Any

import httpx

from app.voice import TextToSpeech, TTSResult, WordTiming
from app.voice.normalizer import estimate_word_timings, normalize_for_tts

log = logging.getLogger(__name__)


def _estimate_wav_duration_ms(audio_bytes: bytes) -> int:
    """Extract duration from WAV header if present, otherwise estimate."""
    if len(audio_bytes) > 44 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        try:
            byte_rate = struct.unpack_from("<I", audio_bytes, 28)[0]
            if byte_rate > 0:
                data_size = len(audio_bytes) - 44
                return int((data_size / byte_rate) * 1000)
        except Exception:
            pass
    # Fallback estimate: ~16kHz 16-bit mono = 32000 bytes/sec
    return int((len(audio_bytes) / 32000.0) * 1000) if audio_bytes else 0


class GeminiTTSProvider(TextToSpeech):
    name = "gemini_tts"
    _BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(
        self,
        api_key: str = "",
        model: str = "gemini-3.8-flash-tts",
        default_voice: str = "Puck",
        style: str = "clear, warm, patient teaching style",
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._default_voice = default_voice
        self._style = style

    async def synthesize(
        self,
        text: str,
        voice: str = "",
        speed: float = 1.0,
    ) -> TTSResult:
        if not self._api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        normalized = normalize_for_tts(text)
        if not normalized.strip():
            raise ValueError("Text to synthesize is empty")

        v = voice or self._default_voice
        url = f"{self._BASE_URL}/{self._model}:generateContent"

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"{self._style}: {normalized}" if self._style else normalized
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": v
                        }
                    }
                },
            },
        }

        t0 = time.monotonic()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                params={"key": self._api_key},
                json=payload,
                headers={"Content-Type": "application/json"},
            )

        if resp.status_code == 429:
            raise RuntimeError(f"Gemini TTS rate limited (429): {resp.text[:200]}")
        if resp.status_code != 200:
            raise RuntimeError(f"Gemini TTS error ({resp.status_code}): {resp.text[:200]}")

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini TTS returned no candidates in response")

        parts = candidates[0].get("content", {}).get("parts", [])
        audio_bytes = b""
        mime_type = "audio/wav"

        for part in parts:
            inline = part.get("inlineData", {})
            if "data" in inline:
                audio_bytes = base64.b64decode(inline["data"])
                mime_type = inline.get("mimeType", "audio/wav")
                break

        if not audio_bytes:
            raise RuntimeError("Gemini TTS response did not contain audio data")

        # Calculate or estimate duration
        duration_ms = _estimate_wav_duration_ms(audio_bytes)
        if duration_ms <= 0:
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            duration_ms = max(elapsed_ms, int(len(normalized.split()) * 400))

        # Word timing estimations for highlighting
        estimated = estimate_word_timings(normalized, duration_ms)
        word_timings = [WordTiming(w["word"], w["startMs"], w["endMs"]) for w in estimated]

        return TTSResult(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            word_timings=word_timings,
            duration_ms=duration_ms,
            provider=self.name,
        )
