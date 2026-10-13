"""
app/api/history.py — Page view history (IDOR-safe).

GET /me/history       — last 50 visited pages
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import History, User

router = APIRouter(tags=["library"])


class HistoryItem(BaseModel):
    id: str
    course_id: str
    page_id: str
    page_title: str
    visited_at: str


@router.get("/me/history", response_model=list[HistoryItem])
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[HistoryItem]:
    result = await db.execute(
        select(History)
        .where(History.user_id == current_user.id)
        .order_by(History.visited_at.desc())
        .limit(50)
    )
    return [
        HistoryItem(
            id=r.id, course_id=r.course_id, page_id=r.page_id,
            page_title=r.page_title, visited_at=r.visited_at.isoformat(),
        )
        for r in result.scalars().all()
    ]
