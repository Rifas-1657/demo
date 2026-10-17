"""
app/voice/stt/adapter.py — Adapter interface for adding new STT providers.

Example: Adding Gemini Audio API as an STT provider.

Usage:
    1. Create a new provider class implementing STTProviderAdapter
    2. Register it in the provider factory
    3. Configure in settings with stt_provider="gemini"
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Protocol

from app.voice import STTResult


class STTProviderAdapter(ABC):
    """
    Abstract base class for STT provider adapters.
    
    Implement this interface to add new STT providers (e.g., Gemini, Azure, AWS).
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name for logging and identification."""
        ...
    
    @abstractmethod
    async def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        hint_lang: str | None = None,
        page_title: str | None = None,
        page_keywords: list[str] | None = None,
    ) -> STTResult:
        """
        Transcribe audio to text.
        
        Args:
            audio_bytes: Audio data
            mime: MIME type (audio/wav, audio/webm, etc.)
            hint_lang: Optional language hint (BCP-47 code like "ta", "en")
            page_title: Current page/lesson title for context
            page_keywords: Key terms from current page for context
        
        Returns:
            STTResult with transcript, language, confidence, duration
        """
        ...
    
    @abstractmethod
    async def transcribe_with_language(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str | None,
    ) -> STTResult:
        """
        Transcribe with explicit language (for language handling strategies).
        
        Args:
            audio_bytes: Audio data
            mime: MIME type
            language: Explicit language code or None for auto-detection
        
        Returns:
            STTResult
        """
        ...


class STTProviderFactory:
    """
    Factory for creating STT provider instances.
    
    Register custom providers here to make them available throughout the app.
    """
    
    @staticmethod
    def create_provider(
        provider_name: str,
        config: dict,
    ) -> STTProviderAdapter | None:
        """
        Create STT provider instance from config.
        
        Args:
            provider_name: Provider identifier (local, groq, gemini, etc.)
            config: Provider configuration dict
        
        Returns:
            STTProviderAdapter instance or None if provider not found
        """
        from app.voice.stt.faster_whisper import FasterWhisperSTT
        from app.voice.stt.groq_whisper import GroqWhisperSTT
        
        if provider_name == "local" or provider_name == "faster-whisper":
            return FasterWhisperSTT(
                model_name=config.get("model", "large-v3-turbo"),
                compute_type=config.get("compute_type", "int8"),
                vad_filter=config.get("vad_filter", True),
                beam_size=config.get("beam_size", 5),
                temperature=config.get("temperature", 0.0),
                no_speech_threshold=config.get("no_speech_threshold", 0.6),
                compression_ratio_threshold=config.get("compression_ratio_threshold", 2.4),
                log_prob_threshold=config.get("log_prob_threshold", -1.0),
                use_context_prompt=config.get("use_context_prompt", True),
            )
        
        elif provider_name == "groq" or provider_name == "groq-whisper":
            api_key = config.get("api_key")
            if not api_key:
                return None
            return GroqWhisperSTT(
                api_key=api_key,
                model=config.get("model", "whisper-large-v3-turbo"),
                use_context_prompt=config.get("use_context_prompt", True),
            )
        
        # Add more providers here as needed:
        # elif provider_name == "gemini":
        #     return GeminiSTT(...)
        # elif provider_name == "azure":
        #     return AzureSTT(...)
        
        return None


# Example: Custom provider template
"""
from app.voice.stt.adapter import STTProviderAdapter
from app.voice import STTResult

class GeminiSTT(STTProviderAdapter):
    '''Gemini Audio API STT provider.'''
    
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash-exp"):
        self._api_key = api_key
        self._model = model
    
    @property
    def name(self) -> str:
        return "gemini"
    
    async def transcribe(
        self,
        audio_bytes: bytes,
        mime: str,
        hint_lang: str | None = None,
        page_title: str | None = None,
        page_keywords: list[str] | None = None,
    ) -> STTResult:
        # Implement Gemini audio transcription
        # Use google.generativeai library
        # Return STTResult
        pass
    
    async def transcribe_with_language(
        self,
        audio_bytes: bytes,
        mime: str,
        language: str | None,
    ) -> STTResult:
        return await self.transcribe(audio_bytes, mime, language)

# Then register in STTProviderFactory.create_provider():
# elif provider_name == "gemini":
#     return GeminiSTT(
#         api_key=config.get("api_key"),
#         model=config.get("model", "gemini-2.0-flash-exp"),
#     )
"""
