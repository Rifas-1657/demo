"""
app/api/bookmarks.py — Bookmarks CRUD (IDOR-safe).

GET    /me/bookmarks
POST   /me/bookmarks
DELETE /me/bookmarks/{id}
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import Bookmark, User

router = APIRouter(prefix="/me/bookmarks", tags=["library"])


class BookmarkIn(BaseModel):
    course_id: str
    chapter_number: int
    page_id: str
    excerpt: str = ""


class BookmarkOut(BaseModel):
    id: str
    course_id: str
    chapter_number: int
    page_id: str
    excerpt: str
    created_at: str


@router.get("", response_model=list[BookmarkOut])
async def list_bookmarks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BookmarkOut]:
    result = await db.execute(
        select(Bookmark)
        .where(Bookmark.user_id == current_user.id)
        .order_by(Bookmark.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        BookmarkOut(
            id=r.id, course_id=r.course_id, chapter_number=r.chapter_number,
            page_id=r.page_id, excerpt=r.excerpt,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("", response_model=BookmarkOut, status_code=status.HTTP_201_CREATED)
async def create_bookmark(
    body: BookmarkIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookmarkOut:
    bookmark = Bookmark(
        user_id=current_user.id,
        course_id=body.course_id,
        chapter_number=body.chapter_number,
        page_id=body.page_id,
        excerpt=body.excerpt,
    )
    db.add(bookmark)
    await db.commit()
    return BookmarkOut(
        id=bookmark.id, course_id=bookmark.course_id,
        chapter_number=bookmark.chapter_number, page_id=bookmark.page_id,
        excerpt=bookmark.excerpt, created_at=bookmark.created_at.isoformat(),
    )


@router.delete("/{bookmark_id}", status_code=204, response_class=Response)
async def delete_bookmark(
    bookmark_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    result = await db.execute(
        select(Bookmark).where(
            Bookmark.id == bookmark_id,
            Bookmark.user_id == current_user.id,  # IDOR: only own bookmarks
        )
    )
    bookmark = result.scalar_one_or_none()
    if bookmark is None:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    await db.delete(bookmark)
    await db.commit()
    return Response(status_code=204)
