"""
app/knowledge/embeddings/mock.py

Deterministic mock embedding backend for tests.
Produces 384-dim pseudo-random vectors seeded from the text hash.
Semantically similar texts will NOT be close (it's random), but the
interface is fully functional and tests can use it without any ML deps.
"""
from __future__ import annotations

import hashlib
import random

from app.knowledge.embeddings import EmbeddingBackend

_DIM = 384


class MockEmbeddingBackend(EmbeddingBackend):
    name = "mock"
    dimension = _DIM

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        result = []
        for text in texts:
            # Deterministic seed from text
            seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2**32)
            rng = random.Random(seed)
            vec = [rng.gauss(0, 1) for _ in range(_DIM)]
            # L2 normalize
            norm = sum(x * x for x in vec) ** 0.5 or 1.0
            result.append([x / norm for x in vec])
        return result
