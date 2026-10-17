"""
app/voice/stt/groq_whisper.py  — Groq Whisper STT provider.

Env: GROQ_API_KEY, GROQ_WHISPER_MODEL (default: whisper-large-v3-turbo)

Enhanced with:
- Configurable language handling
- Context-aware prompts
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
        use_context_prompt: bool = True,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._vocab_hint = vocab_hint
        self._use_context_prompt = use_context_prompt
        
        # Initialize prompt builder if context-aware prompts enabled
        if self._use_context_prompt:
            try:
                from app.voice.stt.prompt_builder import PromptBuilder
                self._prompt_builder = PromptBuilder()
            except Exception as exc:
                import logging
                logging.getLogger(__name__).warning("Failed to initialize prompt builder: %s", exc)
                self._prompt_builder = None
        else:
            self._prompt_builder = None

    async def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        hint_lang: str | None = None,
        page_title: str | None = None,
        page_keywords: list[str] | None = None,
    ) -> STTResult:
        """
        Transcribe audio via Groq Whisper API.
        
        Args:
            audio_bytes: Audio data
            mime: MIME type
            hint_lang: Optional language hint
            page_title: Current page/lesson title for context-aware prompts
            page_keywords: Key terms from current page for context-aware prompts
        """
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
        
        # Build context-aware prompt if enabled
        prompt = self._vocab_hint
        if self._prompt_builder and (page_title or page_keywords):
            try:
                prompt = self._prompt_builder.build_prompt(
                    page_title=page_title,
                    page_keywords=page_keywords,
                )
            except Exception:
                prompt = self._vocab_hint

        data: dict[str, str] = {
            "model": self._model,
            "response_format": "verbose_json",
        }
        if hint_lang:
            data["language"] = hint_lang
        if prompt:
            data["prompt"] = prompt

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
