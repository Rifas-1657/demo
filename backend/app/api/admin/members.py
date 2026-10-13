"""
app/api/admin/members.py — Admin member management.

GET    /admin/members           — list all users
POST   /admin/members/invite    — create invite (returns raw token)
DELETE /admin/members/{user_id} — deactivate a user
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.auth.service import MAX_LEARNER_SEATS, can_add_learner, create_invite
from app.db.database import get_db
from app.db.models import User

router = APIRouter(prefix="/admin/members", tags=["admin"])


class MemberOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    is_active: bool
    created_at: str


class InviteRequest(BaseModel):
    role: str = "learner"
    email: EmailStr | None = None


class InviteResponse(BaseModel):
    token: str
    role: str
    message: str


class MessageResponse(BaseModel):
    message: str


@router.get("", response_model=list[MemberOut])
async def list_members(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[MemberOut]:
    result = await db.execute(select(User).order_by(User.created_at))
    return [
        MemberOut(
            id=u.id, email=u.email, display_name=u.display_name,
            role=u.role, is_active=u.is_active,
            created_at=u.created_at.isoformat(),
        )
        for u in result.scalars().all()
    ]


@router.post("/invite", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
async def create_member_invite(
    body: InviteRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> InviteResponse:
    if body.role == "learner" and not await can_add_learner(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Platform learner seat limit reached (max {MAX_LEARNER_SEATS})",
        )
    raw_token = await create_invite(
        db, created_by=admin.id, role=body.role, invited_email=body.email
    )
    return InviteResponse(
        token=raw_token,
        role=body.role,
        message="Share this invite token with the new member for POST /auth/signup",
    )


@router.delete("/{user_id}", response_model=MessageResponse)
async def remove_member(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.commit()
    return MessageResponse(message=f"User {user.email} deactivated")
