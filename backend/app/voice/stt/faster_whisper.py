"""
app/voice/stt/faster_whisper.py — Local faster-whisper STT with CPU int8 quantization.

Model: large-v3-turbo (default), reused as a singleton across requests.
Non-blocking execution via asyncio.to_thread.
Includes technical Tanglish vocabulary prompt to boost domain transcription accuracy.

Enhanced with:
- Configurable language handling (auto, forced, two-pass)
- VAD filter, beam size, temperature fallback
- Context-aware prompts (page context + glossary terms)
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
        vad_filter: bool = True,
        beam_size: int = 5,
        temperature: float = 0.0,
        no_speech_threshold: float = 0.6,
        compression_ratio_threshold: float = 2.4,
        log_prob_threshold: float = -1.0,
        use_context_prompt: bool = True,
    ) -> None:
        self._model_name = model_name
        self._vocab_hint = vocab_hint
        self._vad_filter = vad_filter
        self._beam_size = beam_size
        self._temperature = temperature
        self._no_speech_threshold = no_speech_threshold
        self._compression_ratio_threshold = compression_ratio_threshold
        self._log_prob_threshold = log_prob_threshold
        self._use_context_prompt = use_context_prompt
        
        # Initialize prompt builder if context-aware prompts enabled
        if self._use_context_prompt:
            try:
                from app.voice.stt.prompt_builder import PromptBuilder
                self._prompt_builder = PromptBuilder()
            except Exception as exc:
                log.warning("Failed to initialize prompt builder: %s", exc)
                self._prompt_builder = None
        else:
            self._prompt_builder = None

    async def transcribe(
        self,
        audio_bytes: bytes,
        mime: str = "audio/webm",
        hint_lang: Optional[str] = None,
        page_title: Optional[str] = None,
        page_keywords: Optional[list[str]] = None,
    ) -> STTResult:
        """
        Transcribe audio using local faster-whisper in a separate thread.
        Never translates into English; preserves verbatim Tanglish transcript.
        
        Args:
            audio_bytes: Audio data
            mime: MIME type
            hint_lang: Optional language hint
            page_title: Current page/lesson title for context-aware prompts
            page_keywords: Key terms from current page for context-aware prompts
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
        
        # Build context-aware prompt if enabled
        initial_prompt = self._vocab_hint
        if self._prompt_builder and (page_title or page_keywords):
            try:
                initial_prompt = self._prompt_builder.build_prompt(
                    page_title=page_title,
                    page_keywords=page_keywords,
                )
                log.debug("Using context-aware prompt: %s", initial_prompt[:100])
            except Exception as exc:
                log.warning("Failed to build context prompt, using default: %s", exc)
                initial_prompt = self._vocab_hint

        def _sync_transcribe() -> STTResult:
            model = get_whisper_model(self._model_name)
            if model is None:
                raise RuntimeError("Local faster_whisper STT engine is not available")

            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = Path(tmp_file.name)

            try:
                # Build temperature list for fallback if temperature > 0
                temperature_list = (
                    [self._temperature] if self._temperature == 0.0
                    else [self._temperature, 0.0, 0.2, 0.4, 0.6, 0.8]
                )
                
                # Transcribe with domain vocabulary prompt; no translation
                segments, info = model.transcribe(
                    str(tmp_path),
                    language=hint_lang or None,
                    task="transcribe",
                    initial_prompt=initial_prompt,
                    beam_size=self._beam_size,
                    vad_filter=self._vad_filter,
                    temperature=temperature_list,
                    no_speech_threshold=self._no_speech_threshold,
                    compression_ratio_threshold=self._compression_ratio_threshold,
                    log_prob_threshold=self._log_prob_threshold,
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
    
    async def transcribe_with_language(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str | None,
    ) -> STTResult:
        """
        Transcribe with explicit language parameter for language handling strategies.
        """
        return await self.transcribe(audio_bytes=audio_bytes, mime=mime, hint_lang=language)
