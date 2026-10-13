"""
app/llm/__init__.py

LLM provider interface + fallback router.

Design:
- LLMProvider ABC: every provider implements generate_text() and generate_json()
- LLMRouter: ordered fallback chain; per-provider timeout + retry + backoff;
  per-day usage counters in DB; 429/quota handling
- Never hardcodes model names: all come from Settings
- Mock provider for tests: deterministic, zero latency, no API key needed

Providers (add more by subclassing LLMProvider and registering in router.py):
  - Gemini          GEMINI_API_KEY
  - Groq            GROQ_API_KEY
  - NVIDIA NIM      NVIDIA_API_KEY
  - OpenRouter      OPENROUTER_API_KEY
  - Mock            always available; controlled output

Usage counters live in DB table llm_usage (date + provider + model + tokens_in + tokens_out).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class LLMResponse:
    text: str
    provider: str
    model: str
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: float = 0.0
    raw: dict = field(default_factory=dict)


class LLMProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        timeout: float = 30.0,
    ) -> LLMResponse:
        """Generate free-form text."""

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        schema: dict,
        system: str = "",
        temperature: float = 0.2,
        max_tokens: int = 8192,
        timeout: float = 60.0,
    ) -> LLMResponse:
        """
        Generate structured JSON matching *schema*.
        Implementations should use native structured output / JSON mode when available,
        falling back to instructed JSON + post-parse.
        """

    @abstractmethod
    async def is_available(self) -> bool:
        """Return False if this provider has no API key configured."""
