"""
IqraBook — Groq API Client
Groq Whisper STT (~85ms) + Llama 4 Scout fast Q&A + intent classification
Falls back to Llama 3.3 / 3.1 Instant if Scout id is unavailable.
"""
import httpx
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

GROQ_CHAT_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]


class GroqClient:
    """Groq API client for ultra-fast STT and text generation."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.groq.com/openai/v1"
        self.headers = {"Authorization": f"Bearer {api_key}"}
        self._chat_model = GROQ_CHAT_MODELS[0]

    async def transcribe_audio(self, audio_bytes: bytes) -> str:
        """
        Transcribe audio using Whisper Large v3 Turbo.
        Latency: ~85ms. Free: 2000 req/day, 7200 audio sec/hr.
        Supports Tamil + English (Tanglish).
        """
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.base_url}/audio/transcriptions",
                    headers=self.headers,
                    files={"file": ("audio.webm", audio_bytes, "audio/webm")},
                    data={
                        "model": "whisper-large-v3-turbo",
                        "response_format": "text",
                    },
                )
                response.raise_for_status()
                return response.text.strip()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Groq STT rate limit hit — fallback to Gemini audio")
                raise
            raise
        except Exception as e:
            logger.error(f"Groq STT error: {e}")
            raise

    async def generate_fast(self, prompt: str, system: str = "") -> str:
        """
        Fast text generation. Prefers Llama 4 Scout, then cheaper Groq models.
        Token optimization: max_tokens=200.
        """
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        models = [self._chat_model] + [m for m in GROQ_CHAT_MODELS if m != self._chat_model]
        last_error: Exception | None = None

        async with httpx.AsyncClient(timeout=20) as client:
            for model in models:
                try:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers={**self.headers, "Content-Type": "application/json"},
                        json={
                            "model": model,
                            "messages": messages,
                            "temperature": 0.5,
                            "max_tokens": 200,
                        },
                    )
                    if response.status_code == 404:
                        logger.warning(f"Groq model unavailable: {model}")
                        continue
                    response.raise_for_status()
                    self._chat_model = model
                    return response.json()["choices"][0]["message"]["content"]
                except httpx.HTTPStatusError as e:
                    last_error = e
                    if e.response.status_code == 429:
                        logger.warning("Groq generate rate limit hit")
                        raise
                    if e.response.status_code in (400, 404):
                        continue
                    raise
                except Exception as e:
                    last_error = e
                    logger.error(f"Groq generate error ({model}): {e}")

        if last_error:
            raise last_error
        raise RuntimeError("Groq chat models unavailable")

    async def classify_intent(self, text: str) -> Dict[str, str]:
        """
        Classify user message intent using Llama (fast, cheap ~50 tokens).
        Returns: {"intent": "QA" | "CONTINUE" | "DIAGRAM" | "OFF_TOPIC"}
        """
        system = (
            "Classify intent. Return ONLY valid JSON. "
            'Options: {"intent":"QA"} {"intent":"CONTINUE"} '
            '{"intent":"DIAGRAM"} {"intent":"OFF_TOPIC"}'
        )
        prompt = f"Message: {text[:200]}"

        try:
            result_str = await self.generate_fast(prompt=prompt, system=system)
            start = result_str.find("{")
            end = result_str.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(result_str[start:end])
            return {"intent": "CONTINUE"}
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Intent classification failed: {e}, defaulting to CONTINUE")
            return {"intent": "CONTINUE"}
