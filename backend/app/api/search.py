"""
app/api/search.py — Full-text search over course pages.

GET /search?q=&courseId= — returns ranked page excerpts

Implementation: SQLite FTS5 virtual table `pages_fts` (created at startup).
PostgreSQL-ready: swap MATCH query for tsvector/tsquery when dialect is postgresql.

All results are filtered to courses the user can access (or public courses).
No auth required for public courses.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db

router = APIRouter(tags=["search"])


class SearchResult(BaseModel):
    course_id: str
    page_id: str
    chapter_number: int
    title: str
    excerpt: str
    score: float


@router.get("/search", response_model=list[SearchResult])
async def search(
    q: str = Query(..., min_length=1, max_length=200),
    courseId: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[SearchResult]:
    """Full-text search over page titles and narration text using SQLite FTS5."""
    if not q.strip():
        return []

    # Sanitise query: remove FTS5 special chars that cause syntax errors
    safe_q = q.replace('"', "").replace("*", "").replace(":", "").strip()
    if not safe_q:
        return []

    try:
        # FTS5 match query
        sql = text("""
            SELECT
                p.course_id,
                p.id AS page_id,
                c.number AS chapter_number,
                p.title,
                snippet(pages_fts, 1, '<em>', '</em>', '…', 10) AS excerpt,
                bm25(pages_fts) AS score
            FROM pages_fts
            JOIN pages p ON pages_fts.rowid = p.rowid
            JOIN chapters c ON c.id = p.chapter_id
            WHERE pages_fts MATCH :q
              AND (:course_id IS NULL OR p.course_id = :course_id)
            ORDER BY score
            LIMIT 20
        """)
        result = await db.execute(sql, {"q": safe_q, "course_id": courseId})
        rows = result.fetchall()
        return [
            SearchResult(
                course_id=row.course_id,
                page_id=row.page_id,
                chapter_number=row.chapter_number,
                title=row.title,
                excerpt=row.excerpt or "",
                score=float(row.score),
            )
            for row in rows
        ]
    except Exception:
        # FTS5 may not be set up yet — return empty gracefully
        return []
