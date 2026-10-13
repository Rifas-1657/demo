"""
app/api/admin/tutor.py — Admin tutor settings endpoints.

GET /admin/tutor-settings/{course_id}
PUT /admin/tutor-settings/{course_id}
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.db.database import get_db
from app.db.models import TutorSettings, User

router = APIRouter(prefix="/admin/tutor-settings", tags=["admin"])


class TutorSettingsIn(BaseModel):
    language: str = "tanglish"
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    tone: str = "friendly"
    voice_id: str = ""
    custom_instructions: str = ""


class TutorSettingsOut(TutorSettingsIn):
    course_id: str
    updated_at: str


@router.get("/{course_id}", response_model=TutorSettingsOut)
async def get_tutor_settings(
    course_id: str,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> TutorSettingsOut:
    result = await db.execute(
        select(TutorSettings).where(TutorSettings.course_id == course_id)
    )
    ts = result.scalar_one_or_none()
    if ts is None:
        raise HTTPException(status_code=404, detail="Tutor settings not found for this course")
    return TutorSettingsOut(
        course_id=ts.course_id, language=ts.language, speed=ts.speed,
        tone=ts.tone, voice_id=ts.voice_id,
        custom_instructions=ts.custom_instructions,
        updated_at=ts.updated_at.isoformat(),
    )


@router.put("/{course_id}", response_model=TutorSettingsOut)
async def upsert_tutor_settings(
    course_id: str,
    body: TutorSettingsIn,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> TutorSettingsOut:
    result = await db.execute(
        select(TutorSettings).where(TutorSettings.course_id == course_id)
    )
    ts = result.scalar_one_or_none()
    if ts is None:
        ts = TutorSettings(course_id=course_id)
        db.add(ts)
    ts.language = body.language
    ts.speed = body.speed
    ts.tone = body.tone
    ts.voice_id = body.voice_id
    ts.custom_instructions = body.custom_instructions
    await db.commit()
    return TutorSettingsOut(
        course_id=ts.course_id, language=ts.language, speed=ts.speed,
        tone=ts.tone, voice_id=ts.voice_id,
        custom_instructions=ts.custom_instructions,
        updated_at=ts.updated_at.isoformat(),
    )
