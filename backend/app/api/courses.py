"""
app/api/courses.py — Course catalog endpoints.

GET /api/courses                          — list all available courses
GET /api/courses/{course_id}              — course detail + chapters
GET /api/courses/{course_id}/pages/{page_id} — single page content

All endpoints are publicly accessible (no auth required) — the course catalog
is public; per-user progress is separate (/me/progress/*).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.db.models import Chapter, Course, Page

router = APIRouter(tags=["courses"])


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ChapterSummary(BaseModel):
    number: int
    title: str
    summary: str
    page_count: int
    locked: bool


class CourseListItem(BaseModel):
    id: str
    title: str
    subtitle: str
    description: str
    level: str
    category: str
    language: str
    available: bool
    author: str
    cover: dict
    outcomes: list
    topics: list
    tutor_style: str
    minutes_per_page: int
    chapter_count: int
    total_pages: int


class CourseDetail(CourseListItem):
    chapters: list[ChapterSummary]


class PageResponse(BaseModel):
    id: str
    course_id: str
    chapter_number: int
    page_number: int
    title: str
    narration_text: str
    paragraphs: list
    key_terms: list
    code_example: dict
    diagram_spec: dict
    cues: list
    practice_prompts: list
    analogies: dict
    estimated_minutes: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/api/courses", response_model=list[CourseListItem])
async def list_courses(db: AsyncSession = Depends(get_db)) -> list[CourseListItem]:
    result = await db.execute(
        select(Course)
        .where(Course.available == True)  # noqa: E712
        .options(selectinload(Course.chapters))
    )
    courses = result.scalars().all()
    return [
        CourseListItem(
            id=c.id, title=c.title, subtitle=c.subtitle,
            description=c.description, level=c.level, category=c.category,
            language=c.language, available=c.available, author=c.author,
            cover=c.cover, outcomes=c.outcomes, topics=c.topics,
            tutor_style=c.tutor_style, minutes_per_page=c.minutes_per_page,
            chapter_count=len(c.chapters),
            total_pages=sum(ch.page_count for ch in c.chapters),
        )
        for c in courses
    ]


@router.get("/api/courses/{course_id}", response_model=CourseDetail)
async def get_course(course_id: str, db: AsyncSession = Depends(get_db)) -> CourseDetail:
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.chapters))
    )
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail=f"Course {course_id!r} not found")
    return CourseDetail(
        id=course.id, title=course.title, subtitle=course.subtitle,
        description=course.description, level=course.level, category=course.category,
        language=course.language, available=course.available, author=course.author,
        cover=course.cover, outcomes=course.outcomes, topics=course.topics,
        tutor_style=course.tutor_style, minutes_per_page=course.minutes_per_page,
        chapter_count=len(course.chapters),
        total_pages=sum(ch.page_count for ch in course.chapters),
        chapters=[
            ChapterSummary(
                number=ch.number, title=ch.title, summary=ch.summary,
                page_count=ch.page_count, locked=ch.locked,
            )
            for ch in sorted(course.chapters, key=lambda ch: ch.number)
        ],
    )


@router.get("/api/courses/{course_id}/pages/{page_id}", response_model=PageResponse)
async def get_page(
    course_id: str, page_id: str, db: AsyncSession = Depends(get_db)
) -> PageResponse:
    result = await db.execute(
        select(Page)
        .join(Chapter, Chapter.id == Page.chapter_id)
        .where(Page.id == page_id, Page.course_id == course_id)
    )
    page = result.scalar_one_or_none()
    if page is None:
        raise HTTPException(
            status_code=404,
            detail=f"Page {page_id!r} not found in course {course_id!r}",
        )
    chapter_result = await db.execute(
        select(Chapter).where(Chapter.id == page.chapter_id)
    )
    chapter = chapter_result.scalar_one()
    return PageResponse(
        id=page.id, course_id=page.course_id,
        chapter_number=chapter.number, page_number=page.page_number,
        title=page.title, narration_text=page.narration_text,
        paragraphs=page.paragraphs, key_terms=page.key_terms,
        code_example=page.code_example, diagram_spec=page.diagram_spec,
        cues=page.cues, practice_prompts=page.practice_prompts,
        analogies=page.analogies, estimated_minutes=page.estimated_minutes,
    )
