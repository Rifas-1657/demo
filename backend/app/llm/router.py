"""
app/llm/router.py

LLM fallback router.

- Builds ordered provider list from Settings
- Iterates providers on error/quota/timeout with exponential backoff
- Records per-day usage in DB (table: llm_usage)
- Raises LLMError with is_exhausted=True only when all providers fail
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import date, datetime
from functools import lru_cache
from typing import Any

from app.llm import LLMProvider, LLMResponse

log = logging.getLogger(__name__)


class LLMError(Exception):
    def __init__(self, message: str, provider: str = "", retryable: bool = False, is_exhausted: bool = False) -> None:
        super().__init__(message)
        self.provider = provider
        self.retryable = retryable
        self.is_exhausted = is_exhausted


async def _record_usage(provider: str, model: str, tokens_in: int, tokens_out: int) -> None:
    """Fire-and-forget usage counter in DB."""
    try:
        from app.db.database import AsyncSessionLocal
        from app.db.models import LLMUsage
        async with AsyncSessionLocal() as db:
            today = date.today().isoformat()
            usage = LLMUsage(
                date=today,
                provider=provider,
                model=model,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
            )
            db.add(usage)
            await db.commit()
    except Exception:
        log.warning("Could not record LLM usage", exc_info=True)


class LLMRouter:
    """
    Ordered fallback chain over multiple LLM providers.

    retry_per_provider: how many times to retry a retryable error (429, timeout)
    backoff_base_s: wait time in seconds before first retry; doubles each attempt
    """

    def __init__(
        self,
        providers: list[LLMProvider],
        retry_per_provider: int = 2,
        backoff_base_s: float = 1.0,
    ) -> None:
        self._providers = providers
        self._retry = retry_per_provider
        self._backoff = backoff_base_s

    async def generate_text(self, prompt: str, system: str = "", **kwargs) -> LLMResponse:
        return await self._dispatch("generate_text", prompt=prompt, system=system, **kwargs)

    async def generate_json(self, prompt: str, schema: dict, system: str = "", **kwargs) -> LLMResponse:
        return await self._dispatch("generate_json", prompt=prompt, schema=schema, system=system, **kwargs)

    async def _dispatch(self, method: str, **kwargs) -> LLMResponse:
        last_error: Exception | None = None
        for provider in self._providers:
            if not await provider.is_available():
                continue
            for attempt in range(self._retry + 1):
                try:
                    fn = getattr(provider, method)
                    resp: LLMResponse = await fn(**kwargs)
                    # Record usage (non-blocking)
                    asyncio.create_task(
                        _record_usage(resp.provider, resp.model, resp.tokens_in, resp.tokens_out)
                    )
                    log.debug(
                        "LLM success provider=%s model=%s latency=%.0fms tok_in=%d tok_out=%d",
                        resp.provider, resp.model, resp.latency_ms, resp.tokens_in, resp.tokens_out,
                    )
                    return resp
                except LLMError as exc:
                    last_error = exc
                    log.warning(
                        "LLM error provider=%s attempt=%d/%d retryable=%s: %s",
                        provider.name, attempt + 1, self._retry + 1, exc.retryable, exc,
                    )
                    if not exc.retryable or attempt == self._retry:
                        break  # try next provider
                    wait = self._backoff * (2 ** attempt)
                    await asyncio.sleep(wait)
                except Exception as exc:
                    last_error = exc
                    log.error("LLM unexpected error provider=%s: %s", provider.name, exc, exc_info=True)
                    break  # try next provider

        raise LLMError(
            f"All LLM providers exhausted. Last error: {last_error}",
            provider="all",
            retryable=False,
            is_exhausted=True,
        )


@lru_cache(maxsize=1)
def get_llm_router() -> LLMRouter:
    """Build router from settings. Cached per process."""
    from app.config import get_settings
    s = get_settings()
    providers: list[LLMProvider] = []

    # Provider order is determined by LLM_PROVIDERS setting
    # Default: gemini,groq,openrouter,mock
    order = [p.strip().lower() for p in s.llm_providers.split(",") if p.strip()]

    def _add(name: str) -> None:
        if name == "gemini" and s.gemini_api_key:
            from app.llm.providers.gemini import GeminiProvider
            providers.append(GeminiProvider(api_key=s.gemini_api_key, model=s.gemini_model))
        elif name == "groq" and s.groq_api_key:
            from app.llm.providers.groq import GroqProvider
            providers.append(GroqProvider(api_key=s.groq_api_key, model=s.groq_model))
        elif name == "openrouter" and s.openrouter_api_key:
            from app.llm.providers.openrouter import OpenRouterProvider
            providers.append(OpenRouterProvider(api_key=s.openrouter_api_key, model=s.openrouter_model))
        elif name == "mock":
            from app.llm.providers.mock import MockLLMProvider
            providers.append(MockLLMProvider())

    for name in order:
        _add(name)

    if not providers:
        # Safety fallback: always have mock so tests work
        from app.llm.providers.mock import MockLLMProvider
        providers.append(MockLLMProvider())
        log.warning("No real LLM providers configured — using mock only")

    log.info("LLM router initialized with %d providers: %s", len(providers), [p.name for p in providers])
    return LLMRouter(
        providers=providers,
        retry_per_provider=s.llm_retry_per_provider,
        backoff_base_s=s.llm_backoff_base_s,
    )
