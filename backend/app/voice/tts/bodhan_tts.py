"""
app/voice/tts/bodhan_tts.py — Bodhan Indic-Speak Text-to-Speech provider.

API: POST https://api.bodhan.ai/v1/audio/speech
Headers:
  Authorization: Bearer <BODHAN_API_KEY>
  Content-Type: application/json
Body:
  {
    "model": "indic-speak",
    "input": "<text>",
    "voice": "Anitha",
    "instructions": "{\"lang\":\"ta\",\"style\":\"educational lecture\"}"
  }
Response:
  Binary WAV audio (audio/wav, PCM 16-bit, 24kHz mono).
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
import wave
from typing import Optional

import httpx

from app.voice import TextToSpeech, TTSResult, WordTiming
from app.voice.normalizer import estimate_word_timings, normalize_for_tts

log = logging.getLogger(__name__)

BODHAN_API_ENDPOINT = "https://api.bodhan.ai/v1/audio/speech"


def parse_wav_duration_ms(wav_bytes: bytes) -> int:
    """Extract playback duration in ms from WAV RIFF header, falling back to 24kHz 16-bit mono."""
    if len(wav_bytes) >= 44 and wav_bytes[:4] == b"RIFF" and wav_bytes[8:12] == b"WAVE":
        try:
            with io.BytesIO(wav_bytes) as bio:
                with wave.open(bio, "rb") as wf:
                    frames = wf.getnframes()
                    rate = wf.getframerate()
                    if rate > 0:
                        return int((frames / rate) * 1000)
        except Exception:
            pass
    # Fallback: Bodhan Indic-Speak default is 24,000 Hz, 16-bit (2 bytes), mono = 48,000 bytes/sec
    return int((len(wav_bytes) / 48000) * 1000)


class BodhanTTSProvider(TextToSpeech):
    name = "bodhan"

    def __init__(
        self,
        api_key: str,
        model: str = "indic-speak",
        default_voice: str = "Anitha",
        lang: str = "ta",
        style: str = "educational lecture",
        endpoint: str = BODHAN_API_ENDPOINT,
        timeout_seconds: float = 30.0,
    ) -> None:
        if not api_key:
            raise ValueError("Bodhan API key is required")
        self._api_key = api_key
        self._model = model
        self._default_voice = default_voice
        self._lang = lang
        self._style = style
        self._endpoint = endpoint
        self._timeout_seconds = timeout_seconds

    async def synthesize(
        self,
        text: str,
        voice: str = "",
        speed: float = 1.0,
    ) -> TTSResult:
        """
        Synthesize text to speech using Bodhan Indic-Speak REST API.
        Returns TTSResult with binary WAV audio and estimated word timings.
        """
        clean_text = normalize_for_tts(text).strip()
        if not clean_text:
            raise ValueError("Cannot synthesize empty text")

        chosen_voice = voice.strip() if voice and voice.strip() else self._default_voice

        # Bodhan instructions format: JSON-encoded string containing lang and style
        instructions_dict = {
            "lang": self._lang,
            "style": self._style,
        }
        instructions_json = json.dumps(instructions_dict)

        payload = {
            "model": self._model,
            "input": clean_text,
            "voice": chosen_voice,
            "instructions": instructions_json,
        }

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "audio/wav, audio/*, application/octet-stream",
        }

        # Handle rate limits with transient retries (up to 2 retries)
        max_retries = 2
        last_status = 0
        last_body = ""

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            for attempt in range(max_retries + 1):
                try:
                    resp = await client.post(
                        self._endpoint,
                        headers=headers,
                        json=payload,
                    )
                    last_status = resp.status_code

                    if resp.status_code == 200:
                        wav_bytes = resp.content
                        if not wav_bytes:
                            raise RuntimeError("Bodhan API returned empty audio content")

                        duration_ms = parse_wav_duration_ms(wav_bytes)
                        timings_raw = estimate_word_timings(clean_text, duration_ms)
                        word_timings = [
                            WordTiming(
                                word=t["word"],
                                start_ms=t["startMs"],
                                end_ms=t["endMs"],
                            )
                            for t in timings_raw
                        ]

                        return TTSResult(
                            audio_bytes=wav_bytes,
                            mime_type="audio/wav",
                            word_timings=word_timings,
                            duration_ms=duration_ms,
                            provider="bodhan",
                            from_cache=False,
                        )

                    if resp.status_code == 429:
                        last_body = resp.text
                        if attempt < max_retries:
                            # Check Retry-After header
                            retry_after = resp.headers.get("Retry-After")
                            wait_time = float(retry_after) if retry_after and retry_after.isdigit() else (1.5 ** attempt)
                            wait_time = min(wait_time, 5.0)
                            log.warning("Bodhan TTS rate limited (429). Retrying in %.1fs (attempt %d/%d)", wait_time, attempt + 1, max_retries)
                            await asyncio.sleep(wait_time)
                            continue
                        raise RuntimeError(f"Bodhan TTS rate limit (HTTP 429): {last_body}")

                    # Other error responses
                    last_body = resp.text
                    log.error("Bodhan API failed (HTTP %d): %s", resp.status_code, last_body)
                    raise RuntimeError(f"Bodhan API error (HTTP {resp.status_code}): {last_body}")

                except (httpx.TimeoutException, TimeoutError):
                    if attempt < max_retries:
                        await asyncio.sleep(1.0)
                        continue
                    raise TimeoutError("Bodhan TTS API request timed out")
                except httpx.RequestError as exc:
                    if attempt < max_retries:
                        await asyncio.sleep(1.0)
                        continue
                    raise RuntimeError(f"Bodhan network error: {exc}")

        raise RuntimeError(f"Bodhan TTS failed with status {last_status}: {last_body}")
