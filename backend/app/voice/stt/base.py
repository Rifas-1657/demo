"""
app/voice/stt/base.py — Enhanced STT base with language handling strategies.
"""
from __future__ import annotations

from typing import Literal, Protocol

from app.voice import STTResult


LanguageMode = Literal["auto", "forced_ta", "forced_en", "two_pass"]


class STTProvider(Protocol):
    """Protocol for STT providers with enhanced language handling."""
    
    name: str
    
    async def transcribe_with_language(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str | None,
    ) -> STTResult:
        """
        Raw transcription with explicit language parameter.
        
        Args:
            audio_bytes: Audio data
            mime: MIME type
            language: Explicit language code or None for auto-detection
        
        Returns:
            STTResult with transcript, detected language, confidence
        """
        ...


class LanguageHandler:
    """
    Language handling strategies for code-mixed speech.
    
    Modes:
    - auto: Let model auto-detect language
    - forced_ta: Force Tamil transcription
    - forced_en: Force English transcription
    - two_pass: Auto-detect first, then force detected language
    """
    
    def __init__(
        self,
        mode: LanguageMode = "auto",
        forced_language: str = "ta",
    ):
        self.mode = mode
        self.forced_language = forced_language
    
    async def transcribe(
        self,
        provider: STTProvider,
        audio_bytes: bytes,
        mime: str,
        hint_lang: str | None = None,
    ) -> STTResult:
        """
        Transcribe with language handling strategy.
        
        Args:
            provider: STT provider instance
            audio_bytes: Audio data
            mime: MIME type
            hint_lang: Optional language hint from client
        
        Returns:
            STTResult with applied language strategy
        """
        if self.mode == "auto":
            # Pure auto-detection
            return await provider.transcribe_with_language(
                audio_bytes=audio_bytes,
                mime=mime,
                language=hint_lang,
            )
        
        elif self.mode == "forced_ta":
            # Force Tamil
            return await provider.transcribe_with_language(
                audio_bytes=audio_bytes,
                mime=mime,
                language="ta",
            )
        
        elif self.mode == "forced_en":
            # Force English
            return await provider.transcribe_with_language(
                audio_bytes=audio_bytes,
                mime=mime,
                language="en",
            )
        
        elif self.mode == "two_pass":
            # Pass 1: Auto-detect
            first_result = await provider.transcribe_with_language(
                audio_bytes=audio_bytes,
                mime=mime,
                language=None,
            )
            
            # Pass 2: Force detected language
            detected_lang = first_result.language or "ta"
            second_result = await provider.transcribe_with_language(
                audio_bytes=audio_bytes,
                mime=mime,
                language=detected_lang,
            )
            
            # Return second pass with detected language from first pass
            return STTResult(
                transcript=second_result.transcript,
                language=detected_lang,
                confidence=first_result.confidence,
                duration_s=second_result.duration_s,
            )
        
        else:
            # Fallback to auto
            return await provider.transcribe_with_language(
                audio_bytes=audio_bytes,
                mime=mime,
                language=hint_lang,
            )
