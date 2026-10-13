"""
IqraBook — ChromaDB RAG vectorstore
Token optimization: top_k=3 max, metadata filtering by course_id
"""
import asyncio
import logging
from typing import Optional

import chromadb
from chromadb.config import Settings

from app.core.config import settings

logger = logging.getLogger(__name__)


class ChromaManager:
    """Manages ChromaDB collections for IqraBook course materials."""

    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False),
        )

    def _get_collection(self, course_id: str):
        """Get or create a collection for a course."""
        return self.client.get_or_create_collection(
            name=f"iqrabook_course_{course_id}",
            metadata={"hnsw:space": "cosine"},
        )

    async def add_documents(
        self,
        texts: list[str],
        metadatas: list[dict],
        course_id: str,
    ) -> None:
        """Add chunked documents to ChromaDB with Gemini embeddings."""
        from app.core.gemini_client import GeminiClient

        gemini = GeminiClient(settings.GEMINI_API_KEY)
        collection = self._get_collection(course_id)

        # Generate embeddings in batches of 10
        batch_size = 10
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_meta = metadatas[i : i + batch_size]

            # Get embeddings (async)
            embeddings = await asyncio.gather(
                *[gemini.generate_embedding(t) for t in batch_texts]
            )

            ids = [f"{course_id}_doc_{i + j}" for j in range(len(batch_texts))]

            collection.add(
                documents=batch_texts,
                embeddings=embeddings,
                metadatas=batch_meta,
                ids=ids,
            )

        logger.info(
            f"Added {len(texts)} chunks to course_{course_id} collection"
        )

    async def similarity_search(
        self,
        query: str,
        course_id: str,
        top_k: int = 3,
    ) -> list[str]:
        """
        Search for relevant chunks.
        Token optimization: max top_k=3 to limit context size.
        """
        from app.core.gemini_client import GeminiClient

        try:
            gemini = GeminiClient(settings.GEMINI_API_KEY)
            collection = self._get_collection(course_id)

            # Check if collection has documents
            if collection.count() == 0:
                return []

            query_embedding = await gemini.generate_embedding(query)

            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k, collection.count()),
            )

            docs = results.get("documents", [[]])[0]
            return docs

        except Exception as e:
            logger.warning(f"ChromaDB search failed: {e}")
            return []

    def get_collection_stats(self, course_id: str) -> dict:
        """Get document count for a course collection."""
        try:
            collection = self._get_collection(course_id)
            return {
                "course_id": course_id,
                "document_count": collection.count(),
            }
        except Exception:
            return {"course_id": course_id, "document_count": 0}
