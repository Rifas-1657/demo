"""
app/voice/stt/faster_whisper.py — Local faster-whisper STT with CPU int8 quantization.

Model: large-v3-turbo (default), reused as a singleton across requests.
Non-blocking execution via asyncio.to_thread.
Includes technical Tanglish vocabulary prompt to boost domain transcription accuracy.
"""
from __future__ import annotations

import asyncio
import logging
import tempfile
import threading
from pathlib import Path
from typing import Optional

from app.voice import SpeechToText, STTResult

log = logging.getLogger(__name__)

DEFAULT_LOCAL_VOCAB_PROMPT = (
    "React, Python, FastAPI, LangGraph, RAG, embeddings, vector database, API, "
    "StateGraph, variable, loop, function, code, memory, class, print, list, dict"
)

_MODEL_CACHE: dict[str, object] = {}
_MODEL_LOCK = threading.Lock()


def get_whisper_model(model_name: str = "large-v3-turbo"):
    """Thread-safe singleton getter for Faster-Whisper model."""
    if model_name not in _MODEL_CACHE:
        with _MODEL_LOCK:
            if model_name not in _MODEL_CACHE:
                try:
                    from faster_whisper import WhisperModel
                    log.info("Loading local faster-whisper model '%s' (device=cpu, compute_type=int8)...", model_name)
                    _MODEL_CACHE[model_name] = WhisperModel(
                        model_name,
                        device="cpu",
                        compute_type="int8",
                    )
                    log.info("Successfully loaded faster-whisper model '%s'", model_name)
                except ImportError:
                    log.error("faster_whisper package is not installed")
                    _MODEL_CACHE[model_name] = None
                except Exception as exc:
                    log.error("Failed to load faster-whisper model '%s': %s", model_name, exc)
                    raise
    return _MODEL_CACHE[model_name]


class FasterWhisperSTT(SpeechToText):
    name = "faster_whisper"

    def __init__(
        self,
        model_name: str = "large-v3-turbo",
        vocab_hint: str = DEFAULT_LOCAL_VOCAB_PROMPT,
    ) -> None:
        self._model_name = model_name
        self._vocab_hint = vocab_hint

    async def transcribe(
        self,
        audio_bytes: bytes,
        mime: str = "audio/webm",
        hint_lang: Optional[str] = None,
    ) -> STTResult:
        """
        Transcribe audio using local faster-whisper in a separate thread.
        Never translates into English; preserves verbatim Tanglish transcript.
        """
        if not audio_bytes:
            raise ValueError("Uploaded audio file is empty")

        if len(audio_bytes) > self.MAX_BYTES:
            raise ValueError(f"Audio file exceeds {self.MAX_BYTES // (1024 * 1024)}MB limit")

        mime_lower = (mime or "").lower()
        suffix = ".webm"
        if "wav" in mime_lower:
            suffix = ".wav"
        elif "ogg" in mime_lower:
            suffix = ".ogg"
        elif "mp4" in mime_lower or "m4a" in mime_lower:
            suffix = ".mp4"
        elif "mp3" in mime_lower:
            suffix = ".mp3"

        def _sync_transcribe() -> STTResult:
            model = get_whisper_model(self._model_name)
            if model is None:
                raise RuntimeError("Local faster_whisper STT engine is not available")

            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = Path(tmp_file.name)

            try:
                # Transcribe with domain vocabulary prompt; no translation
                segments, info = model.transcribe(
                    str(tmp_path),
                    language=hint_lang or None,
                    task="transcribe",
                    initial_prompt=self._vocab_hint,
                    beam_size=5,
                    vad_filter=True,
                )
                text_parts = [segment.text.strip() for segment in segments if segment.text.strip()]
                full_text = " ".join(text_parts).strip()

                return STTResult(
                    transcript=full_text,
                    language=info.language or (hint_lang or "ta"),
                    confidence=info.language_probability if hasattr(info, "language_probability") else 1.0,
                    duration_s=info.duration if hasattr(info, "duration") else 0.0,
                )
            finally:
                tmp_path.unlink(missing_ok=True)

        return await asyncio.to_thread(_sync_transcribe)
