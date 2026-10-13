"""
app/knowledge/vectorstore/chroma.py

ChromaDB vector store implementation (local dev / test).

- Persistent: stores on disk at settings.chroma_persist_dir
- Ephemeral: in-memory when persist_dir is None (tests)
- Collection name: f"bookey_{course_id}_{embedding_model.replace('/', '_')}"
- Refuses to add vectors if dimension doesn't match existing collection
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from app.knowledge.vectorstore import VectorMatch, VectorStore

log = logging.getLogger(__name__)


def _collection_name(course_id: str, embedding_model: str) -> str:
    safe = embedding_model.replace("/", "_").replace("-", "_").replace(".", "_")
    return f"bookey_{course_id}_{safe}"[:63]  # Chroma has 63-char limit


class ChromaVectorStore(VectorStore):
    def __init__(self, persist_dir: str | None = None) -> None:
        self._persist_dir = persist_dir
        self._client: Any = None

    def _get_client(self) -> Any:
        if self._client is None:
            import chromadb
            if self._persist_dir:
                self._client = chromadb.PersistentClient(path=self._persist_dir)
            else:
                self._client = chromadb.EphemeralClient()
        return self._client

    def _get_collection(self, course_id: str, embedding_model: str, dimension: int) -> Any:
        client = self._get_client()
        name = _collection_name(course_id, embedding_model)
        try:
            col = client.get_or_create_collection(
                name=name,
                metadata={
                    "hnsw:space": "cosine",
                    "embedding_model": embedding_model,
                    "dimension": dimension,
                    "course_id": course_id,
                },
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to get/create Chroma collection: {exc}") from exc

        # Guard against mixing dimensions
        existing_dim = col.metadata.get("dimension")
        if existing_dim and existing_dim != dimension:
            raise RuntimeError(
                f"Dimension mismatch for collection '{name}': "
                f"existing={existing_dim}, requested={dimension}. "
                "Cannot mix embedding models in one index."
            )
        return col

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
        def _sync():
            col = self._get_collection(course_id, embedding_model, dimension)
            col.upsert(
                ids=[chunk_id],
                embeddings=[vector],
                documents=[text],
                metadatas=[{
                    "document_id": document_id,
                    "page_number": page_number,
                    "heading_path": json.dumps(heading_path),
                    "token_count": token_count,
                }],
            )
        await asyncio.to_thread(_sync)

    async def query(
        self,
        course_id: str,
        embedding_model: str,
        dimension: int,
        query_vector: list[float],
        top_k: int = 10,
        document_ids: list[str] | None = None,
    ) -> list[VectorMatch]:
        def _sync() -> list[VectorMatch]:
            col = self._get_collection(course_id, embedding_model, dimension)
            where: dict | None = None
            if document_ids is not None:
                if len(document_ids) == 1:
                    where = {"document_id": document_ids[0]}
                elif document_ids:
                    where = {"document_id": {"$in": document_ids}}
                else:
                    return []  # empty filter = no results

            count = col.count()
            if count == 0:
                return []

            results = col.query(
                query_embeddings=[query_vector],
                n_results=min(top_k, count),
                where=where,
                include=["documents", "metadatas", "distances"],
            )
            matches = []
            for i, chunk_id in enumerate(results["ids"][0]):
                meta = results["metadatas"][0][i]
                dist = results["distances"][0][i]  # L2 or cosine distance
                # Chroma returns cosine distance; convert to similarity score
                score = 1.0 - dist
                matches.append(VectorMatch(
                    chunk_id=chunk_id,
                    document_id=meta["document_id"],
                    text=results["documents"][0][i],
                    score=score,
                    page_number=int(meta.get("page_number", 0)),
                    heading_path=json.loads(meta.get("heading_path", "[]")),
                    token_count=int(meta.get("token_count", 0)),
                ))
            return matches
        return await asyncio.to_thread(_sync)

    async def delete_by_document(
        self,
        course_id: str,
        embedding_model: str,
        document_id: str,
    ) -> None:
        def _sync():
            client = self._get_client()
            name = _collection_name(course_id, embedding_model)
            try:
                col = client.get_collection(name)
                col.delete(where={"document_id": document_id})
            except Exception:
                pass  # collection may not exist
        await asyncio.to_thread(_sync)

    async def collection_info(self, course_id: str, embedding_model: str) -> dict:
        def _sync() -> dict:
            client = self._get_client()
            name = _collection_name(course_id, embedding_model)
            try:
                col = client.get_collection(name)
                return {
                    "name": name,
                    "count": col.count(),
                    "metadata": col.metadata,
                }
            except Exception:
                return {"name": name, "count": 0, "metadata": {}}
        return await asyncio.to_thread(_sync)
