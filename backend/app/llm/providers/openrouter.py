"""
app/llm/providers/openrouter.py — OpenRouter provider (access to 100+ models).

Config env vars:
  OPENROUTER_API_KEY
  OPENROUTER_MODEL  (default: meta-llama/llama-3.1-70b-instruct)
"""
from __future__ import annotations

import time

import httpx

from app.llm import LLMProvider, LLMResponse


class OpenRouterProvider(LLMProvider):
    name = "openrouter"
    _BASE = "https://openrouter.ai/api/v1"

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model

    async def is_available(self) -> bool:
        return bool(self._api_key)

    async def generate_text(self, prompt: str, system: str = "", temperature: float = 0.7, max_tokens: int = 4096, timeout: float = 30.0) -> LLMResponse:
        return await self._call(prompt, system, temperature, max_tokens, timeout, json_mode=False)

    async def generate_json(self, prompt: str, schema: dict, system: str = "", temperature: float = 0.2, max_tokens: int = 8192, timeout: float = 60.0) -> LLMResponse:
        return await self._call(
            prompt + "\n\nRespond ONLY with valid JSON. No markdown.",
            system, temperature, max_tokens, timeout, json_mode=True,
        )

    async def _call(self, prompt: str, system: str, temperature: float, max_tokens: int, timeout: float, json_mode: bool) -> LLMResponse:
        from app.llm.router import LLMError

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        body: dict = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "HTTP-Referer": "https://bookey.app",
            "X-Title": "Bookey Tutor",
        }
        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(f"{self._BASE}/chat/completions", json=body, headers=headers)
        except httpx.TimeoutException as exc:
            raise LLMError("OpenRouter timeout", provider=self.name, retryable=True) from exc

        if resp.status_code == 429:
            raise LLMError("OpenRouter 429 rate-limit", provider=self.name, retryable=True)
        if resp.status_code != 200:
            raise LLMError(f"OpenRouter {resp.status_code}: {resp.text[:200]}", provider=self.name, retryable=False)

        data = resp.json()
        latency = (time.monotonic() - t0) * 1000
        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        return LLMResponse(
            text=text,
            provider=self.name,
            model=self._model,
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
            latency_ms=latency,
            raw=data,
        )
