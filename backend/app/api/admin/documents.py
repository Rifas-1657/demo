"""
app/api/admin/documents.py

Document management API for admins.

Endpoints:
  POST   /api/admin/documents/upload                 — upload a document
  GET    /api/admin/documents                        — list all (paginated)
  GET    /api/admin/documents/{doc_id}               — get status + metadata
  DELETE /api/admin/documents/{doc_id}               — delete + cascade
  POST   /api/admin/documents/{doc_id}/retry         — re-queue failed doc
  GET    /api/admin/documents/{doc_id}/chunks        — list chunks (debug)
  GET    /api/admin/documents/status-stream          — SSE status stream

Security:
  - Admin role required on all endpoints
  - Magic-byte verification on upload (not just extension)
  - Random storage key (UUID prefix, never the original filename)
  - Max 25 MB enforced before touching storage
"""
from __future__ import annotations

import asyncio
import json
import logging
import secrets
import uuid
from datetime import datetime
from typing import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_admin
from app.config import get_settings
from app.db.database import get_db
from app.db.models import Document, DocumentChunk, User
from app.knowledge import get_storage, get_vector_store, get_embedding_backend
from app.knowledge.parsing.magic import verify_magic
from app.knowledge.worker import process_document

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/documents", tags=["admin-documents"])
settings = get_settings()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class DocumentOut(BaseModel):
    id: str
    course_id: str
    original_filename: str
    mime_type: str
    size_bytes: int
    status: str
    error_message: str | None
    page_count: int | None
    chunk_count: int | None
    embedding_model: str | None
    uploaded_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChunkOut(BaseModel):
    id: str
    chunk_index: int
    page_number: int
    heading_path: list[str]
    token_count: int
    text_preview: str  # first 200 chars

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=DocumentOut,
)
async def upload_document(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    """
    Upload a document (PDF, DOCX, MD, TXT) for a course.
    Verifies magic bytes, enforces 25 MB limit, stores with random key.
    Processing (parse → chunk → embed) runs in the background.
    """
    # Size check
    data = await file.read()
    if len(data) > settings.max_document_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {settings.max_document_size_bytes // (1024*1024)} MB",
        )
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    # Magic-byte verification
    original_filename = file.filename or "unknown"
    ok, mime, error = verify_magic(data, original_filename)
    if not ok:
        raise HTTPException(status_code=415, detail=error)

    # Validate course exists (basic check)
    from app.db.models import Course
    course = await db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail=f"Course '{course_id}' not found")

    # Generate random storage key (never expose original filename in storage)
    rand_prefix = secrets.token_hex(16)
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "bin"
    storage_key = f"documents/{course_id}/{rand_prefix}.{ext}"

    # Persist to storage
    storage = get_storage()
    await storage.store(storage_key, data)

    # Create DB record
    doc = Document(
        id=str(uuid.uuid4()),
        course_id=course_id,
        original_filename=original_filename,
        storage_key=storage_key,
        mime_type=mime,
        size_bytes=len(data),
        status="uploaded",
        uploaded_by=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Launch background processing
    background_tasks.add_task(process_document, doc.id)

    log.info(
        "document uploaded: id=%s filename=%s course=%s size=%d",
        doc.id, original_filename, course_id, len(data),
    )
    return DocumentOut.model_validate(doc)


# ---------------------------------------------------------------------------
# List + Get
# ---------------------------------------------------------------------------

@router.get("", response_model=list[DocumentOut])
async def list_documents(
    course_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentOut]:
    q = select(Document).order_by(Document.created_at.desc()).limit(limit).offset(offset)
    if course_id:
        q = q.where(Document.course_id == course_id)
    result = await db.execute(q)
    return [DocumentOut.model_validate(d) for d in result.scalars()]


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(
    doc_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut.model_validate(doc)


# ---------------------------------------------------------------------------
# Delete (cascade to chunks + vectors)
# ---------------------------------------------------------------------------

@router.delete("/{doc_id}", status_code=204, response_class=Response)
async def delete_document(
    doc_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from storage
    storage = get_storage()
    try:
        await storage.delete(doc.storage_key)
    except Exception:
        log.warning("Could not delete storage key %s", doc.storage_key)

    # Delete from vector store (chunks cascade in DB via FK)
    emb = get_embedding_backend()
    vs = get_vector_store()
    try:
        await vs.delete_by_document(doc.course_id, emb.name, doc_id)
    except Exception:
        log.warning("Could not delete vectors for document %s", doc_id)

    # Delete DB record (cascades to document_chunks)
    await db.delete(doc)
    await db.commit()

    log.info("document deleted: id=%s", doc_id)
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Retry (re-queue failed document)
# ---------------------------------------------------------------------------

@router.post("/{doc_id}/retry", response_model=DocumentOut)
async def retry_document(
    doc_id: str,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status not in ("failed", "uploaded"):
        raise HTTPException(
            status_code=409,
            detail=f"Document is '{doc.status}', only failed/uploaded documents can be retried",
        )
    doc.status = "uploaded"
    doc.error_message = None
    await db.commit()
    await db.refresh(doc)
    background_tasks.add_task(process_document, doc_id)
    return DocumentOut.model_validate(doc)


# ---------------------------------------------------------------------------
# Chunks (debug / inspection)
# ---------------------------------------------------------------------------

@router.get("/{doc_id}/chunks", response_model=list[ChunkOut])
async def list_chunks(
    doc_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[ChunkOut]:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == doc_id)
        .order_by(DocumentChunk.chunk_index)
    )
    chunks = result.scalars().all()
    return [
        ChunkOut(
            id=c.id,
            chunk_index=c.chunk_index,
            page_number=c.page_number,
            heading_path=c.heading_path,
            token_count=c.token_count,
            text_preview=c.text[:200],
        )
        for c in chunks
    ]


# ---------------------------------------------------------------------------
# SSE status stream
# ---------------------------------------------------------------------------

@router.get("/status-stream")
async def status_stream(
    course_id: str | None = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Server-Sent Events stream that pushes document status updates.
    Polls DB every 2 seconds and emits changed statuses.
    """
    async def _generator() -> AsyncGenerator[str, None]:
        seen: dict[str, str] = {}
        for _ in range(150):  # max 5 minutes (150 * 2s)
            q = select(Document).order_by(Document.created_at.desc()).limit(100)
            if course_id:
                q = q.where(Document.course_id == course_id)
            result = await db.execute(q)
            docs = result.scalars().all()
            for doc in docs:
                if seen.get(doc.id) != doc.status:
                    seen[doc.id] = doc.status
                    payload = {
                        "id": doc.id,
                        "status": doc.status,
                        "error": doc.error_message,
                        "chunk_count": doc.chunk_count,
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(
        _generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
