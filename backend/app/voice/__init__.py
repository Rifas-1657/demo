"""
app/voice/__init__.py

Voice pipeline interfaces.

STT (Speech-to-Text):
  SpeechToText ABC → GroqWhisperSTT | FasterWhisperSTT (fallback)

TTS (Text-to-Speech):
  TextToSpeech ABC → GeminiTTS | EdgeTTS (fallback) | SilentTTS (final fallback)

Audio cache keyed by sha256(text + voice + speed)[:24].
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class STTResult:
    transcript: str
    language: str = "ta"
    confidence: float = 1.0
    duration_s: float = 0.0


@dataclass
class WordTiming:
    word: str
    start_ms: int
    end_ms: int


@dataclass
class TTSResult:
    audio_bytes: bytes
    mime_type: str = "audio/mpeg"
    word_timings: list[WordTiming] = field(default_factory=list)
    duration_ms: int = 0
    provider: str = ""
    from_cache: bool = False


class SpeechToText(ABC):
    name: str = "base"
    MAX_BYTES: int = 10 * 1024 * 1024   # 10 MB
    MAX_DURATION_S: float = 60.0

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, mime: str, hint_lang: str = "ta") -> STTResult:
        """Transcribe audio. Raises ValueError if oversized."""


class TextToSpeech(ABC):
    name: str = "base"

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice: str = "default",
        speed: float = 1.0,
    ) -> TTSResult:
        """Synthesize speech. Returns TTSResult with audio bytes + word timings."""
