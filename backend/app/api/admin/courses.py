"""
app/api/admin/courses.py — Admin course CRUD.

GET    /admin/courses
POST   /admin/courses
GET    /admin/courses/{id}
PATCH  /admin/courses/{id}
DELETE /admin/courses/{id}
POST   /admin/courses/{id}/publish    — set available=True
POST   /admin/courses/{id}/unpublish  — set available=False
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import require_admin
from app.db.database import get_db
from app.db.models import Course, User

router = APIRouter(prefix="/admin/courses", tags=["admin"])


class CourseIn(BaseModel):
    id: str
    title: str
    subtitle: str = ""
    description: str = ""
    level: str = "Beginner"
    category: str = "Programming"
    language: str = "Python"
    available: bool = False
    author: str = "Bookey"
    cover: dict = {}
    outcomes: list = []
    topics: list = []
    tutor_style: str = ""
    minutes_per_page: int = 4


class CourseOut(CourseIn):
    chapter_count: int
    total_pages: int
    created_at: str


class MessageResponse(BaseModel):
    message: str


def _to_out(c: Course) -> CourseOut:
    return CourseOut(
        id=c.id, title=c.title, subtitle=c.subtitle, description=c.description,
        level=c.level, category=c.category, language=c.language,
        available=c.available, author=c.author, cover=c.cover,
        outcomes=c.outcomes, topics=c.topics, tutor_style=c.tutor_style,
        minutes_per_page=c.minutes_per_page,
        chapter_count=len(c.chapters),
        total_pages=sum(ch.page_count for ch in c.chapters),
        created_at=c.created_at.isoformat(),
    )


@router.get("", response_model=list[CourseOut])
async def list_courses(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[CourseOut]:
    result = await db.execute(
        select(Course).options(selectinload(Course.chapters))
    )
    return [_to_out(c) for c in result.scalars().all()]


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CourseIn,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> CourseOut:
    existing = await db.execute(select(Course).where(Course.id == body.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Course {body.id!r} already exists")
    course = Course(**body.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return _to_out(course)


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(
    course_id: str,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> CourseOut:
    result = await db.execute(
        select(Course).where(Course.id == course_id)
        .options(selectinload(Course.chapters))
    )
    c = result.scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return _to_out(c)


@router.patch("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: str,
    body: CourseIn,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> CourseOut:
    result = await db.execute(
        select(Course).where(Course.id == course_id)
        .options(selectinload(Course.chapters))
    )
    c = result.scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Course not found")
    for field, value in body.model_dump(exclude={"id"}).items():
        setattr(c, field, value)
    await db.commit()
    return _to_out(c)


@router.delete("/{course_id}", response_model=MessageResponse)
async def delete_course(
    course_id: str,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await db.execute(select(Course).where(Course.id == course_id))
    c = result.scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.delete(c)
    await db.commit()
    return MessageResponse(message=f"Course {course_id!r} deleted")


@router.post("/{course_id}/publish", response_model=MessageResponse)
async def publish_course(
    course_id: str,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await db.execute(select(Course).where(Course.id == course_id))
    c = result.scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Course not found")
    c.available = True
    await db.commit()
    return MessageResponse(message=f"Course {course_id!r} published")


@router.post("/{course_id}/unpublish", response_model=MessageResponse)
async def unpublish_course(
    course_id: str,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await db.execute(select(Course).where(Course.id == course_id))
    c = result.scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Course not found")
    c.available = False
    await db.commit()
    return MessageResponse(message=f"Course {course_id!r} unpublished")
