"""
app/api/progress.py — User progress endpoints.

GET  /me/progress                  — summary for all courses
GET  /me/progress/{course_id}      — per-course progress
POST /me/progress/{course_id}/{page_id}/complete — mark page complete
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import Course, History, Progress, User

router = APIRouter(prefix="/me/progress", tags=["progress"])


class ProgressItem(BaseModel):
    course_id: str
    page_id: str
    completed: bool
    last_word_index: int
    last_segment_id: str | None
    completed_at: str | None
    updated_at: str


class CourseProgressSummary(BaseModel):
    course_id: str
    completed_pages: int
    total_pages: int


@router.get("", response_model=list[CourseProgressSummary])
async def list_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CourseProgressSummary]:
    # Get all courses
    courses_result = await db.execute(select(Course))
    courses = courses_result.scalars().all()
    result = []
    for course in courses:
        prog_result = await db.execute(
            select(Progress).where(
                Progress.user_id == current_user.id,
                Progress.course_id == course.id,
            )
        )
        rows = prog_result.scalars().all()
        total_pages = sum(ch.page_count for ch in course.chapters) if course.chapters else 0
        result.append(CourseProgressSummary(
            course_id=course.id,
            completed_pages=sum(1 for r in rows if r.completed),
            total_pages=total_pages,
        ))
    return result


@router.get("/{course_id}", response_model=list[ProgressItem])
async def get_course_progress(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProgressItem]:
    result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.course_id == course_id,
        )
    )
    rows = result.scalars().all()
    return [
        ProgressItem(
            course_id=r.course_id, page_id=r.page_id,
            completed=r.completed, last_word_index=r.last_word_index,
            last_segment_id=r.last_segment_id,
            completed_at=r.completed_at.isoformat() if r.completed_at else None,
            updated_at=r.updated_at.isoformat(),
        )
        for r in rows
    ]


class CompleteResponse(BaseModel):
    page_id: str
    completed: bool


@router.post("/{course_id}/{page_id}/complete", response_model=CompleteResponse)
async def mark_page_complete(
    course_id: str,
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompleteResponse:
    result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.page_id == page_id,
        )
    )
    row = result.scalar_one_or_none()
    now = datetime.utcnow()
    if row is None:
        row = Progress(
            user_id=current_user.id,
            course_id=course_id,
            page_id=page_id,
            completed=True,
            completed_at=now,
        )
        db.add(row)
    else:
        row.completed = True
        row.completed_at = now

    # Record in history
    history = History(
        user_id=current_user.id,
        course_id=course_id,
        page_id=page_id,
        page_title="",  # filled from page lookup if needed
        visited_at=now,
    )
    db.add(history)
    await db.commit()
    return CompleteResponse(page_id=page_id, completed=True)
