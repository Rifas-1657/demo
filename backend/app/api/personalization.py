"""
app/api/personalization.py

B6-1 endpoints: bandit arm selection, reward submission,
mastery scores, FSRS revision queue and review submission.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_admin
from app.db.database import get_db
from app.db.models import User

router = APIRouter(prefix="/api", tags=["personalization"])


# ---------------------------------------------------------------------------
# Bandit
# ---------------------------------------------------------------------------

class BanditSelectResponse(BaseModel):
    arm: int
    label: str
    state: dict


class RewardRequest(BaseModel):
    arm: int
    signal: str  # RewardSignal literal


@router.get("/me/bandit/{topic}", response_model=BanditSelectResponse)
async def select_arm(
    topic: str,
    rng_seed: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Choose the best explanation style for this learner + topic."""
    from app.personalization.bandit import load_bandit_state
    state = await load_bandit_state(db, user.id, topic)
    arm = state.sample(rng_seed=rng_seed)
    return BanditSelectResponse(arm=arm, label=state.arm_label(arm), state=state.to_dict())


@router.post("/me/bandit/{topic}/reward")
async def submit_reward(
    topic: str,
    body: RewardRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Record a reward signal and update the bandit posterior."""
    from app.personalization.bandit import record_reward
    updated = await record_reward(db, user.id, topic, body.arm, body.signal)  # type: ignore[arg-type]
    return updated.to_dict()


# Admin debug view
@router.get("/admin/bandit/{user_id}/{topic}")
async def admin_bandit_debug(
    user_id: str,
    topic: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.personalization.bandit import load_bandit_state
    state = await load_bandit_state(db, user_id, topic)
    return state.to_dict()


# ---------------------------------------------------------------------------
# FSRS mastery + revision
# ---------------------------------------------------------------------------

class ReviewRequest(BaseModel):
    rating: str  # "again" | "hard" | "good" | "easy"


@router.get("/me/mastery")
async def get_mastery(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return per-topic mastery scores for the dashboard."""
    from sqlalchemy import select
    from app.db.models import FSRSCardModel
    from app.personalization.fsrs import FSRSCard

    rows = (await db.execute(
        select(FSRSCardModel).where(FSRSCardModel.user_id == user.id)
    )).scalars().all()

    def _d(v):
        return v.date() if v is not None and hasattr(v, "date") else v

    return {
        "mastery": [
            FSRSCard(
                user_id=user.id,
                topic=r.topic,
                stability=r.stability,
                difficulty=r.difficulty,
                last_review_date=_d(r.last_review_date),
                review_count=r.review_count,
                lapses=r.lapses,
            ).to_dict()
            for r in rows
        ]
    }


@router.get("/me/revision-queue")
async def get_revision_queue(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return cards due for review today."""
    from app.personalization.fsrs import get_revision_queue
    cards = await get_revision_queue(db, user.id)
    return {"due": [c.to_dict() for c in cards], "count": len(cards)}


@router.post("/me/review/{topic}")
async def submit_review(
    topic: str,
    body: ReviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a review result and get the updated card."""
    from app.personalization.fsrs import submit_review
    card = await submit_review(db, user.id, topic, body.rating)  # type: ignore[arg-type]
    return card.to_dict()
