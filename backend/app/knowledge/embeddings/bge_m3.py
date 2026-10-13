"""
app/knowledge/embeddings/bge_m3.py

BGE-M3 local embedding backend via sentence-transformers.
- Model: BAAI/bge-m3 (1536-dim, multilingual)
- Device: auto-detected (cuda > mps > cpu) or forced via EMBEDDING_DEVICE env
- Lazy load: model is loaded on first call, NOT at import time
- Batched: processes EMBEDDING_BATCH_SIZE texts at once (default 32)
"""
from __future__ import annotations

import asyncio
import os
from functools import lru_cache
from typing import Any

from app.knowledge.embeddings import EmbeddingBackend


_MODEL_NAME = "BAAI/bge-m3"
_DIMENSION = 1024  # bge-m3 output dimension


@lru_cache(maxsize=1)
def _load_model() -> Any:
    """Load and cache the sentence-transformer model."""
    from sentence_transformers import SentenceTransformer
    device = os.getenv("EMBEDDING_DEVICE", "auto")
    if device == "auto":
        try:
            import torch
            if torch.cuda.is_available():
                device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"
        except ImportError:
            device = "cpu"
    return SentenceTransformer(_MODEL_NAME, device=device)


def _embed_sync(texts: list[str], batch_size: int) -> list[list[float]]:
    model = _load_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return [e.tolist() for e in embeddings]


class BgeM3Backend(EmbeddingBackend):
    name = "bge-m3"
    dimension = _DIMENSION

    def __init__(self, batch_size: int = 32) -> None:
        self._batch_size = batch_size

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.to_thread(_embed_sync, texts, self._batch_size)
