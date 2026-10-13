"""
app/knowledge/worker.py

Document processing pipeline.
Called as an asyncio.create_task() after document upload.

Pipeline:
  1. Parse document (PDF/DOCX/MD/TXT)
  2. Chunk into token-bounded segments
  3. Embed each chunk (batched)
  4. Upsert into vector store
  5. Persist DocumentChunk rows in DB
  6. Update Document.status → "indexed" or "failed"

Status events are written to Document.status so the frontend can poll or
subscribe (SSE endpoint in the API layer).

Retryable: re-calling process_document() on a failed doc resets status
to "processing" and replaces old chunks (cascade delete + re-insert).
"""
from __future__ import annotations

import logging
import secrets
import uuid

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.db.models import Document, DocumentChunk
from app.knowledge import get_embedding_backend, get_storage, get_vector_store
from app.knowledge.chunking import chunk_pages
from app.knowledge.parsing import ParseError, parse_document

log = logging.getLogger(__name__)


async def _set_status(doc_id: str, status: str, error: str | None = None) -> None:
    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, doc_id)
        if doc:
            doc.status = status
            if error is not None:
                doc.error_message = error[:2000]
            await db.commit()


async def process_document(document_id: str) -> None:
    """
    Full processing pipeline for one document.
    Idempotent: safe to call multiple times (re-processes from scratch).
    """
    log.info("B2 worker: starting processing document=%s", document_id)

    # Mark processing
    await _set_status(document_id, "processing")

    storage = get_storage()
    emb = get_embedding_backend()
    vs = get_vector_store()

    try:
        # ----------------------------------------------------------------
        # 1. Load document metadata + raw bytes from storage
        # ----------------------------------------------------------------
        async with AsyncSessionLocal() as db:
            doc: Document | None = await db.get(Document, document_id)
            if doc is None:
                log.error("Document %s not found in DB", document_id)
                return
            storage_key = doc.storage_key
            mime_type = doc.mime_type
            course_id = doc.course_id

        raw_bytes = await storage.retrieve(storage_key)

        # ----------------------------------------------------------------
        # 2. Parse
        # ----------------------------------------------------------------
        pages = await parse_document(raw_bytes, mime_type)
        page_count = len(pages)
        log.info("document=%s parsed pages=%d", document_id, page_count)

        # ----------------------------------------------------------------
        # 3. Chunk
        # ----------------------------------------------------------------
        chunks = chunk_pages(pages)
        log.info("document=%s chunks=%d", document_id, len(chunks))

        # ----------------------------------------------------------------
        # 4. Delete old chunks (retry scenario)
        # ----------------------------------------------------------------
        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(DocumentChunk).where(DocumentChunk.document_id == document_id)
            )
            await db.commit()
        # Also delete old vectors
        await vs.delete_by_document(course_id, emb.name, document_id)

        # ----------------------------------------------------------------
        # 5. Embed + upsert (batched)
        # ----------------------------------------------------------------
        EMBED_BATCH = get_embedding_backend().dimension  # reuse instance
        batch_size = 32
        db_chunks: list[DocumentChunk] = []

        for batch_start in range(0, len(chunks), batch_size):
            batch = chunks[batch_start:batch_start + batch_size]
            texts = [c.text for c in batch]
            vectors = await emb.embed_batch(texts)

            for chunk, vector in zip(batch, vectors):
                chunk_id = str(uuid.uuid4())
                # Upsert into vector store
                await vs.upsert(
                    course_id=course_id,
                    embedding_model=emb.name,
                    dimension=emb.dimension,
                    chunk_id=chunk_id,
                    document_id=document_id,
                    vector=vector,
                    text=chunk.text,
                    page_number=chunk.page_number,
                    heading_path=chunk.heading_path,
                    token_count=chunk.token_count,
                )
                db_chunks.append(DocumentChunk(
                    id=chunk_id,
                    document_id=document_id,
                    chunk_index=chunk.chunk_index,
                    text=chunk.text,
                    heading_path=chunk.heading_path,
                    page_number=chunk.page_number,
                    token_count=chunk.token_count,
                    embedding_model=emb.name,
                    vector_id=chunk_id,
                ))

        # ----------------------------------------------------------------
        # 6. Persist chunks + update document
        # ----------------------------------------------------------------
        async with AsyncSessionLocal() as db:
            db.add_all(db_chunks)
            doc = await db.get(Document, document_id)
            if doc:
                doc.status = "indexed"
                doc.page_count = page_count
                doc.chunk_count = len(db_chunks)
                doc.embedding_model = emb.name
                doc.embedding_dim = emb.dimension
                doc.error_message = None
            await db.commit()

        log.info(
            "document=%s indexed: pages=%d chunks=%d model=%s",
            document_id, page_count, len(db_chunks), emb.name,
        )

    except ParseError as exc:
        log.warning("document=%s parse error: %s", document_id, exc)
        await _set_status(document_id, "failed", str(exc))

    except Exception as exc:
        log.exception("document=%s unexpected error", document_id)
        await _set_status(document_id, "failed", f"Internal error: {type(exc).__name__}")
