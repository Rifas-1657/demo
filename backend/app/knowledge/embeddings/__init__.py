"""
app/knowledge/embeddings/__init__.py

EmbeddingBackend interface.
All backends produce fixed-dimension float32 vectors.
The backend name and dimension are recorded per-index; mixing is refused.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class EmbeddingBackend(ABC):
    name: str        # e.g. "bge-m3", "text-embedding-3-small", "mock"
    dimension: int   # vector dimension

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a batch of texts. Returns one vector per text.
        Implementations should normalize vectors (cosine similarity ready).
        """

    async def embed_one(self, text: str) -> list[float]:
        results = await self.embed_batch([text])
        return results[0]
