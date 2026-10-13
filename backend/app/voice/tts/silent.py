"""
app/voice/tts/silent.py  — Silent TTS (text-only fallback).

When all TTS providers fail, emit a notice event and return empty audio.
This allows the learner to still read the answer while a notice is displayed.
"""
from __future__ import annotations

from app.voice import TextToSpeech, TTSResult, WordTiming
from app.voice.normalizer import estimate_word_timings


class SilentTTS(TextToSpeech):
    name = "silent"

    async def synthesize(self, text: str, voice: str = "", speed: float = 1.0) -> TTSResult:
        # Estimate timings at 150 wpm so cues still advance
        estimated_duration_ms = int(len(text.split()) / 150 * 60_000)
        estimated = estimate_word_timings(text, estimated_duration_ms)
        word_timings = [WordTiming(w["word"], w["startMs"], w["endMs"]) for w in estimated]
        return TTSResult(
            audio_bytes=b"",
            mime_type="audio/mpeg",
            word_timings=word_timings,
            duration_ms=estimated_duration_ms,
            provider=self.name,
        )
