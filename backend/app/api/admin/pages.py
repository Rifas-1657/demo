"""
app/api/admin/pages.py

Page generation admin API.

Endpoints:
  POST /api/admin/pages/generate        — generate one page (sync, returns result)
  POST /api/admin/pages/generate-chapter — generate a full chapter (background + SSE progress)
  GET  /api/admin/pages                 — list cached pages (filterable by course/chapter)
  GET  /api/admin/pages/{course}/{ch}/{page} — get specific page
  POST /api/admin/pages/{course}/{ch}/{page}/rollback — rollback to previous version
  GET  /api/admin/pages/usage           — LLM usage counters per day/provider
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.db.database import get_db
from app.db.models import GeneratedPage as GPModel, LLMUsage, PageGenLog, User
from app.page_gen.pipeline import GenerationError, generate_page
from app.page_gen.schema import GeneratedPage

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/pages", tags=["admin-pages"])


# ---------------------------------------------------------------------------
# Request/Response schemas
# ---------------------------------------------------------------------------

class GeneratePageRequest(BaseModel):
    course_id: str
    chapter: int
    page: int
    chapter_topic: str = ""
    page_topic: str = ""
    personalization_hash: str = ""
    content_version: str = "v1"
    regenerate: bool = False


class ChapterGenerateRequest(BaseModel):
    course_id: str
    chapter: int
    chapter_topic: str = ""
    total_pages: int = 5
    content_version: str = "v1"
    regenerate: bool = False


class PageOut(BaseModel):
    id: str
    course_id: str
    chapter_number: int
    page_number: int
    cache_key: str
    status: str
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UsageRow(BaseModel):
    date: str
    provider: str
    model: str
    tokens_in: int
    tokens_out: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate", response_model=GeneratedPage)
async def generate_one_page(
    req: GeneratePageRequest,
    current_user: User = Depends(require_admin),
) -> GeneratedPage:
    """
    Synchronously generate (or return cached) a single page.
    Raises 400 for unsupported courses; 422 on generation failure.
    """
    try:
        page = await generate_page(
            course_id=req.course_id,
            chapter=req.chapter,
            page=req.page,
            chapter_topic=req.chapter_topic,
            page_topic=req.page_topic,
            personalization_hash=req.personalization_hash,
            content_version=req.content_version,
            regenerate=req.regenerate,
        )
        return page
    except GenerationError as exc:
        if "not supported" in str(exc):
            raise HTTPException(status_code=400, detail=str(exc))
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/generate-chapter")
async def generate_chapter(
    req: ChapterGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
) -> StreamingResponse:
    """
    Generate all pages of a chapter as a background task.
    Returns SSE stream with progress events.
    """
    async def _stream():
        for page_num in range(1, req.total_pages + 1):
            yield f"data: {json.dumps({'page': page_num, 'status': 'generating'})}\n\n"
            try:
                page = await generate_page(
                    course_id=req.course_id,
                    chapter=req.chapter,
                    page=page_num,
                    chapter_topic=req.chapter_topic,
                    page_topic=f"Page {page_num}",
                    content_version=req.content_version,
                    regenerate=req.regenerate,
                )
                yield f"data: {json.dumps({'page': page_num, 'status': 'done', 'verified': page.verified})}\n\n"
            except GenerationError as exc:
                yield f"data: {json.dumps({'page': page_num, 'status': 'failed', 'error': str(exc)[:200]})}\n\n"
            await asyncio.sleep(0)  # yield to event loop

        yield f"data: {json.dumps({'status': 'complete', 'total': req.total_pages})}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("", response_model=list[PageOut])
async def list_pages(
    course_id: str | None = None,
    chapter: int | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[PageOut]:
    q = select(GPModel).order_by(GPModel.updated_at.desc()).limit(limit).offset(offset)
    if course_id:
        q = q.where(GPModel.course_id == course_id)
    if chapter is not None:
        q = q.where(GPModel.chapter_number == chapter)
    if status:
        q = q.where(GPModel.status == status)
    result = await db.execute(q)
    return [PageOut.model_validate(r) for r in result.scalars()]


@router.get("/{course_id}/{chapter}/{page_num}")
async def get_page(
    course_id: str,
    chapter: int,
    page_num: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(GPModel).where(
            GPModel.course_id == course_id,
            GPModel.chapter_number == chapter,
            GPModel.page_number == page_num,
        ).order_by(GPModel.version.desc())
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"meta": PageOut.model_validate(row), "content": row.content}


@router.post("/{course_id}/{chapter}/{page_num}/rollback")
async def rollback_page(
    course_id: str,
    chapter: int,
    page_num: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Rollback page to 'draft' status (un-publish).
    Full version rollback would require a version history table (future sprint).
    """
    result = await db.execute(
        select(GPModel).where(
            GPModel.course_id == course_id,
            GPModel.chapter_number == chapter,
            GPModel.page_number == page_num,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Page not found")
    row.status = "archived"
    await db.commit()
    return {"status": "archived", "page": page_num}


@router.get("/usage", response_model=list[UsageRow])
async def llm_usage(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UsageRow]:
    """Return aggregated LLM token usage for the last N days."""
    from sqlalchemy import text
    result = await db.execute(
        select(
            LLMUsage.date,
            LLMUsage.provider,
            LLMUsage.model,
            func.sum(LLMUsage.tokens_in).label("tokens_in"),
            func.sum(LLMUsage.tokens_out).label("tokens_out"),
        )
        .group_by(LLMUsage.date, LLMUsage.provider, LLMUsage.model)
        .order_by(LLMUsage.date.desc())
        .limit(days * 10)
    )
    return [
        UsageRow(date=r.date, provider=r.provider, model=r.model,
                 tokens_in=r.tokens_in, tokens_out=r.tokens_out)
        for r in result
    ]
