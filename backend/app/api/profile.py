"""
app/api/profile.py — User profile and settings endpoints.

GET   /me                — current user profile
PATCH /me                — update display_name / avatar_url
GET   /me/settings       — placeholder (no-op for now)
PATCH /me/settings       — placeholder
DELETE /me/data          — hard-delete all user data (GDPR)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import User

router = APIRouter(tags=["profile"])


class ProfileOut(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: str | None
    role: str
    created_at: str


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None


class SettingsOut(BaseModel):
    theme: str = "dark"
    language: str = "tanglish"
    notifications_enabled: bool = True


class MessageResponse(BaseModel):
    message: str


@router.get("/me", response_model=ProfileOut)
async def get_profile(current_user: User = Depends(get_current_user)) -> ProfileOut:
    return ProfileOut(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        created_at=current_user.created_at.isoformat(),
    )


@router.patch("/me", response_model=ProfileOut)
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    await db.commit()
    return ProfileOut(
        id=current_user.id, email=current_user.email,
        display_name=current_user.display_name, avatar_url=current_user.avatar_url,
        role=current_user.role, created_at=current_user.created_at.isoformat(),
    )


@router.get("/me/settings", response_model=SettingsOut)
async def get_settings(_: User = Depends(get_current_user)) -> SettingsOut:
    # TODO: store in DB; returns defaults for now
    return SettingsOut()


@router.patch("/me/settings", response_model=SettingsOut)
async def update_settings(
    body: SettingsOut,
    _: User = Depends(get_current_user),
) -> SettingsOut:
    # TODO: persist to DB
    return body


@router.delete("/me/data", response_model=MessageResponse)
async def delete_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """GDPR: deactivate account and mark for deletion."""
    current_user.is_active = False
    current_user.email = f"deleted_{current_user.id}@deleted.invalid"
    current_user.display_name = "[deleted]"
    await db.commit()
    return MessageResponse(message="Account deactivated. Data will be purged within 30 days.")
