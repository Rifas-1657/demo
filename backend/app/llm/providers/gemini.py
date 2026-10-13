"""
app/llm/providers/gemini.py — Google Gemini provider via google-generativeai SDK.

Config env vars:
  GEMINI_API_KEY
  GEMINI_MODEL  (default: gemini-1.5-flash)
"""
from __future__ import annotations

import json
import time
from typing import Any

import httpx

from app.llm import LLMProvider, LLMResponse


class GeminiProvider(LLMProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model
        self._base = "https://generativelanguage.googleapis.com/v1"

    async def is_available(self) -> bool:
        return bool(self._api_key)

    async def generate_text(self, prompt: str, system: str = "", temperature: float = 0.7, max_tokens: int = 4096, timeout: float = 30.0) -> LLMResponse:
        return await self._call(prompt, system, temperature, max_tokens, timeout, json_mode=False)

    async def generate_json(self, prompt: str, schema: dict, system: str = "", temperature: float = 0.2, max_tokens: int = 8192, timeout: float = 60.0) -> LLMResponse:
        # Gemini supports response_mime_type for JSON
        return await self._call(
            prompt + "\n\nRespond ONLY with valid JSON matching the schema. No markdown, no explanation.",
            system, temperature, max_tokens, timeout, json_mode=True,
        )

    async def _call(self, prompt: str, system: str, temperature: float, max_tokens: int, timeout: float, json_mode: bool) -> LLMResponse:
        from app.llm.router import LLMError

        url = f"{self._base}/models/{self._model}:generateContent?key={self._api_key}"
        contents = [{"role": "user", "parts": [{"text": prompt}]}]
        body: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}
        if json_mode:
            body["generationConfig"]["responseMimeType"] = "application/json"

        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=body)
        except httpx.TimeoutException as exc:
            raise LLMError("Gemini timeout", provider=self.name, retryable=True) from exc

        if resp.status_code == 429:
            raise LLMError("Gemini 429 quota", provider=self.name, retryable=True)
        if resp.status_code != 200:
            raise LLMError(f"Gemini {resp.status_code}: {resp.text[:200]}", provider=self.name, retryable=False)

        data = resp.json()
        latency = (time.monotonic() - t0) * 1000
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as exc:
            raise LLMError(f"Gemini unexpected response: {data}", provider=self.name, retryable=False) from exc

        usage = data.get("usageMetadata", {})
        return LLMResponse(
            text=text,
            provider=self.name,
            model=self._model,
            tokens_in=usage.get("promptTokenCount", 0),
            tokens_out=usage.get("candidatesTokenCount", 0),
            latency_ms=latency,
            raw=data,
        )
