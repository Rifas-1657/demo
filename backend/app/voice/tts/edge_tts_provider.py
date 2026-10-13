"""
app/voice/tts/edge_tts_provider.py  — Microsoft Edge TTS (edge-tts) fallback.

Tamil voice: ta-IN-ValluvarNeural (male) or ta-IN-PallaviNeural (female).
Env: EDGE_TTS_VOICE (default: ta-IN-ValluvarNeural)

Word boundaries are provided by edge-tts's SSML boundary callbacks.
"""
from __future__ import annotations

import asyncio
import io
import time
from typing import Any

from app.voice import TextToSpeech, TTSResult, WordTiming
from app.voice.normalizer import estimate_word_timings


class EdgeTTSProvider(TextToSpeech):
    name = "edge_tts"

    def __init__(self, voice: str = "ta-IN-ValluvarNeural") -> None:
        self._default_voice = voice

    async def synthesize(self, text: str, voice: str = "", speed: float = 1.0) -> TTSResult:
        try:
            import edge_tts
        except ImportError:
            raise RuntimeError("edge-tts not installed: pip install edge-tts")

        v = voice or self._default_voice
        rate = f"{int((speed - 1.0) * 100):+d}%"

        communicate = edge_tts.Communicate(text, v, rate=rate)
        audio_chunks: list[bytes] = []
        word_timings: list[WordTiming] = []

        t0 = time.monotonic()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                offset_ms = chunk.get("offset", 0) // 10000  # 100ns → ms
                duration_ms = chunk.get("duration", 0) // 10000
                word_timings.append(WordTiming(
                    word=chunk.get("text", ""),
                    start_ms=offset_ms,
                    end_ms=offset_ms + duration_ms,
                ))

        audio_bytes = b"".join(audio_chunks)
        total_ms = int((time.monotonic() - t0) * 1000)

        # If no word boundaries, estimate
        if not word_timings and audio_bytes:
            dur_ms = word_timings[-1].end_ms if word_timings else total_ms
            estimated = estimate_word_timings(text, dur_ms or total_ms)
            word_timings = [WordTiming(w["word"], w["startMs"], w["endMs"]) for w in estimated]

        duration_ms = word_timings[-1].end_ms if word_timings else total_ms
        return TTSResult(
            audio_bytes=audio_bytes,
            mime_type="audio/mpeg",
            word_timings=word_timings,
            duration_ms=duration_ms,
            provider=self.name,
        )
