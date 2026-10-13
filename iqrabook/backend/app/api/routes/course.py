"""
IqraBook — Course API routes
GET /courses → list all courses
GET /courses/{course_id} → course details + roadmap
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import json
from typing import Optional

from app.db.database import get_db
from app.models.course import Course

router = APIRouter(prefix="/courses", tags=["courses"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class TopicSchema(BaseModel):
    id: str
    title: str
    estimated_mins: int
    order: int


class CourseResponse(BaseModel):
    id: int
    title: str
    description: str
    total_topics: int
    roadmap: list[TopicSchema]
    github_repos: list[str]

    class Config:
        from_attributes = True


# ── Seed data (used if DB is empty) ──────────────────────────────

SEED_COURSES = [
    {
        "title": "Python",
        "description": "Variables irundhu Advanced Python varaikkum — practical examples la kathukalam!",
        "total_topics": 25,
        "roadmap_json": json.dumps([
            {"id": "py_01", "title": "Introduction & Setup", "estimated_mins": 15, "order": 1},
            {"id": "py_02", "title": "Variables & Data Types", "estimated_mins": 20, "order": 2},
            {"id": "py_03", "title": "Operators & Expressions", "estimated_mins": 15, "order": 3},
            {"id": "py_04", "title": "Strings & String Methods", "estimated_mins": 20, "order": 4},
            {"id": "py_05", "title": "Lists & Tuples", "estimated_mins": 25, "order": 5},
            {"id": "py_06", "title": "Dictionaries & Sets", "estimated_mins": 25, "order": 6},
            {"id": "py_07", "title": "Conditionals (if/elif/else)", "estimated_mins": 20, "order": 7},
            {"id": "py_08", "title": "Loops (for & while)", "estimated_mins": 25, "order": 8},
            {"id": "py_09", "title": "List Comprehensions", "estimated_mins": 20, "order": 9},
            {"id": "py_10", "title": "Functions", "estimated_mins": 30, "order": 10},
            {"id": "py_11", "title": "Lambda & Higher-Order Functions", "estimated_mins": 20, "order": 11},
            {"id": "py_12", "title": "Error Handling (try/except)", "estimated_mins": 20, "order": 12},
            {"id": "py_13", "title": "File I/O", "estimated_mins": 20, "order": 13},
            {"id": "py_14", "title": "Modules & Packages", "estimated_mins": 20, "order": 14},
            {"id": "py_15", "title": "OOP — Classes & Objects", "estimated_mins": 35, "order": 15},
            {"id": "py_16", "title": "OOP — Inheritance & Polymorphism", "estimated_mins": 30, "order": 16},
            {"id": "py_17", "title": "Decorators", "estimated_mins": 25, "order": 17},
            {"id": "py_18", "title": "Generators & Iterators", "estimated_mins": 25, "order": 18},
            {"id": "py_19", "title": "Context Managers", "estimated_mins": 15, "order": 19},
            {"id": "py_20", "title": "Regular Expressions", "estimated_mins": 25, "order": 20},
            {"id": "py_21", "title": "NumPy Basics", "estimated_mins": 30, "order": 21},
            {"id": "py_22", "title": "Pandas Basics", "estimated_mins": 30, "order": 22},
            {"id": "py_23", "title": "Virtual Environments & pip", "estimated_mins": 15, "order": 23},
            {"id": "py_24", "title": "Testing with pytest", "estimated_mins": 25, "order": 24},
            {"id": "py_25", "title": "Final Project", "estimated_mins": 60, "order": 25},
        ]),
        "github_repos_json": json.dumps([]),
    },
    {
        "title": "Java",
        "description": "OOP, Data Structures, vera ellam — Java la strong aagalam!",
        "total_topics": 20,
        "roadmap_json": json.dumps([]),
        "github_repos_json": json.dumps([]),
    },
    {
        "title": "Machine Learning",
        "description": "Linear Regression irundhu Neural Networks varaikkum — ML complete ah padikalam!",
        "total_topics": 18,
        "roadmap_json": json.dumps([]),
        "github_repos_json": json.dumps([]),
    },
    {
        "title": "HTML & Web Dev",
        "description": "HTML, CSS, JavaScript — Beautiful websites build pannalam!",
        "total_topics": 15,
        "roadmap_json": json.dumps([]),
        "github_repos_json": json.dumps([]),
    },
]


# ── Routes ────────────────────────────────────────────────────────

@router.get("/", response_model=list[CourseResponse])
async def list_courses(db: AsyncSession = Depends(get_db)):
    """List all available courses. Seeds DB if empty."""
    result = await db.execute(select(Course))
    courses = result.scalars().all()

    # Seed if empty
    if not courses:
        for seed in SEED_COURSES:
            course = Course(**seed)
            db.add(course)
        await db.commit()
        result = await db.execute(select(Course))
        courses = result.scalars().all()

    return [_to_response(c) for c in courses]


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single course with full roadmap."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return _to_response(course)


def _to_response(course: Course) -> dict:
    roadmap = json.loads(course.roadmap_json or "[]")
    repos = json.loads(course.github_repos_json or "[]")
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "total_topics": course.total_topics,
        "roadmap": roadmap,
        "github_repos": repos,
    }
