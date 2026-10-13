"""
app/knowledge/vectorstore/__init__.py

VectorStore interface.

Implementations:
  - ChromaVectorStore  — local dev/test (no server required)
  - PgVectorStore      — production PostgreSQL + pgvector extension

Each collection is namespaced by (course_id, embedding_model, dimension)
so models are never mixed.

Chunk metadata stored alongside each vector:
  document_id, chunk_id, page_number, heading_path (JSON), token_count
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class VectorMatch:
    chunk_id: str
    document_id: str
    text: str
    score: float          # higher = more similar (cosine)
    page_number: int
    heading_path: list[str]
    token_count: int


class VectorStore(ABC):

    @abstractmethod
    async def upsert(
        self,
        course_id: str,
        embedding_model: str,
        dimension: int,
        chunk_id: str,
        document_id: str,
        vector: list[float],
        text: str,
        page_number: int,
        heading_path: list[str],
        token_count: int,
    ) -> None:
        """Insert or update a single chunk vector."""

    @abstractmethod
    async def query(
        self,
        course_id: str,
        embedding_model: str,
        dimension: int,
        query_vector: list[float],
        top_k: int = 10,
        document_ids: list[str] | None = None,
    ) -> list[VectorMatch]:
        """
        ANN search within a course collection.
        Optionally filter to a subset of document_ids (for access control).
        """

    @abstractmethod
    async def delete_by_document(
        self,
        course_id: str,
        embedding_model: str,
        document_id: str,
    ) -> None:
        """Delete all vectors belonging to a document (cascade on doc delete)."""

    @abstractmethod
    async def collection_info(
        self, course_id: str, embedding_model: str
    ) -> dict:
        """Return metadata about the collection (count, dimension, etc.)."""
