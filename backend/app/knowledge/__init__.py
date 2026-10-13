"""
app/knowledge/__init__.py

Factory functions for storage, embedding, and vector store backends.
All are cached per-process and selected via settings.
"""
from __future__ import annotations

from functools import lru_cache

from app.config import get_settings
from app.knowledge.embeddings import EmbeddingBackend
from app.knowledge.storage import StorageBackend
from app.knowledge.vectorstore import VectorStore


@lru_cache(maxsize=1)
def get_storage() -> StorageBackend:
    s = get_settings()
    if s.storage_backend == "s3":
        from app.knowledge.storage.s3 import S3StorageBackend
        return S3StorageBackend(
            bucket=s.s3_bucket,
            access_key=s.s3_access_key,
            secret_key=s.s3_secret_key,
            region=s.s3_region,
            endpoint_url=s.s3_endpoint_url or None,
        )
    from app.knowledge.storage.local import LocalStorageBackend
    return LocalStorageBackend(root=s.storage_local_root)


@lru_cache(maxsize=1)
def get_embedding_backend() -> EmbeddingBackend:
    s = get_settings()
    backend = s.embedding_backend.lower()
    if backend == "bge_m3":
        from app.knowledge.embeddings.bge_m3 import BgeM3Backend
        return BgeM3Backend(batch_size=s.embedding_batch_size)
    if backend == "api":
        from app.knowledge.embeddings.api import ApiEmbeddingBackend
        return ApiEmbeddingBackend()
    # Default: mock (safe for dev/test, no model download required)
    from app.knowledge.embeddings.mock import MockEmbeddingBackend
    return MockEmbeddingBackend()


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    s = get_settings()
    if s.vector_store == "pgvector":
        raise NotImplementedError(
            "pgvector backend requires PostgreSQL. Set VECTOR_STORE=chroma for local dev."
        )
    from app.knowledge.vectorstore.chroma import ChromaVectorStore
    persist = s.chroma_persist_dir if s.chroma_persist_dir else None
    return ChromaVectorStore(persist_dir=persist)
