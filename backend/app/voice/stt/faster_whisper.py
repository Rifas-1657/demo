"""
app/voice/stt/faster_whisper.py  — Local faster-whisper fallback STT.

Model: large-v3-turbo or distil-large-v3 (smaller on CPU).
Lazy-loads on first call; no startup delay.

Env: FASTER_WHISPER_MODEL (default: large-v3-turbo)
"""
from __future__ import annotations

import asyncio
import io
import tempfile
from pathlib import Path

from app.voice import SpeechToText, STTResult

_model_cache = {}


def _load_model(model_name: str):
    if model_name not in _model_cache:
        try:
            from faster_whisper import WhisperModel
            _model_cache[model_name] = WhisperModel(model_name, device="cpu", compute_type="int8")
        except ImportError:
            _model_cache[model_name] = None
    return _model_cache[model_name]


class FasterWhisperSTT(SpeechToText):
    name = "faster_whisper"

    def __init__(self, model_name: str = "large-v3-turbo") -> None:
        self._model_name = model_name

    async def transcribe(self, audio_bytes: bytes, mime: str, hint_lang: str = "ta") -> STTResult:
        if len(audio_bytes) > self.MAX_BYTES:
            raise ValueError(f"Audio too large: {len(audio_bytes)} bytes")

        def _sync() -> STTResult:
            model = _load_model(self._model_name)
            if model is None:
                raise RuntimeError("faster_whisper not installed")
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                f.write(audio_bytes)
                tmp_path = f.name
            try:
                segments, info = model.transcribe(tmp_path, language=hint_lang or None, beam_size=5)
                text = " ".join(s.text.strip() for s in segments)
                return STTResult(
                    transcript=text.strip(),
                    language=info.language,
                    duration_s=info.duration,
                )
            finally:
                Path(tmp_path).unlink(missing_ok=True)

        return await asyncio.to_thread(_sync)
