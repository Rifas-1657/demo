"""
IqraBook — RL feedback route
POST /api/rl/feedback → update Q-table based on engagement
GET  /api/rl/action/{session_id} → get next teaching action
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import json

from app.db.database import get_db
from app.models.session import UserSession
from app.rl.q_learning import IqraQLearning

router = APIRouter(prefix="/rl", tags=["rl"])


class FeedbackRequest(BaseModel):
    session_id: int
    engagement: dict   # {code_success, time_on_page, question_asked, etc.}
    current_skill: float
    current_attention: float
    last_action: str


class ActionResponse(BaseModel):
    action: str
    epsilon: float
    explanation: str


@router.post("/feedback")
async def submit_feedback(
    req: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update RL Q-table based on student engagement metrics.
    Called after each page/topic interaction.
    Zero API cost — pure numpy.
    """
    result = await db.execute(
        select(UserSession).where(UserSession.id == req.session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    rl = IqraQLearning(
        q_table_json=session.rl_q_table_json or "{}",
        epsilon=session.rl_epsilon or 0.3,
    )

    reward = rl.calculate_reward(req.engagement)

    # Use same state as next state (we don't know future yet)
    rl.update(
        skill=req.current_skill,
        attention=req.current_attention,
        action=req.last_action,
        reward=reward,
        next_skill=req.current_skill,
        next_attention=req.current_attention,
    )

    # Save updated Q-table
    q_data = json.loads(rl.to_json())
    session.rl_q_table_json = rl.to_json()
    session.rl_epsilon = rl.epsilon
    await db.commit()

    return {
        "success": True,
        "reward": reward,
        "epsilon": rl.epsilon,
        "best_actions": rl.best_action_per_state,
    }


@router.get("/action/{session_id}", response_model=ActionResponse)
async def get_action(
    session_id: int,
    skill: float = 0.3,
    attention: float = 0.7,
    db: AsyncSession = Depends(get_db),
):
    """Get the RL-recommended next teaching action."""
    result = await db.execute(
        select(UserSession).where(UserSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    rl = IqraQLearning(
        q_table_json=session.rl_q_table_json or "{}",
        epsilon=session.rl_epsilon or 0.3,
    )

    action = rl.select_action(skill=skill, attention=attention)

    explanations = {
        "increase_detail": "Student is doing well — going deeper!",
        "decrease_detail": "Simplifying — student needs more time",
        "add_quiz": "Testing understanding with a quick question",
        "more_diagrams": "Visual learner — showing a diagram",
        "add_example": "Adding a relatable example",
        "simplify": "Breaking it down simpler",
    }

    return ActionResponse(
        action=action,
        epsilon=rl.epsilon,
        explanation=explanations.get(action, "Adapting teaching style"),
    )
