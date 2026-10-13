"""
app/knowledge/embeddings/api.py

Hosted embedding API fallback backend.
Compatible with OpenAI /v1/embeddings API (also works with local Ollama,
vLLM, LM Studio, etc. that expose the same interface).

Config via env:
  EMBEDDING_API_URL   — base URL (e.g. https://api.openai.com or http://localhost:11434)
  EMBEDDING_API_KEY   — bearer token (blank for local)
  EMBEDDING_API_MODEL — model name (default: text-embedding-3-small)
  EMBEDDING_API_DIM   — output dimension (default: 1536)
"""
from __future__ import annotations

import asyncio
import os

import httpx

from app.knowledge.embeddings import EmbeddingBackend


class ApiEmbeddingBackend(EmbeddingBackend):
    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        dimension: int | None = None,
    ) -> None:
        self._base_url = (base_url or os.getenv("EMBEDDING_API_URL", "")).rstrip("/")
        self._api_key  = api_key  or os.getenv("EMBEDDING_API_KEY", "")
        self._model    = model    or os.getenv("EMBEDDING_API_MODEL", "text-embedding-3-small")
        self.name      = f"api/{self._model}"
        self.dimension = dimension or int(os.getenv("EMBEDDING_API_DIM", "1536"))

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self._base_url}/v1/embeddings",
                headers=headers,
                json={"input": texts, "model": self._model},
            )
            resp.raise_for_status()
            data = resp.json()

        # Sort by index to preserve order
        items = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in items]
