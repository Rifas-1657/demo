"""
IqraBook — Survey API routes
POST /survey → submit pre-course survey, get initial RL state
GET  /survey/{user_id}/{course_id} → get existing survey
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Literal
import json

from app.db.database import get_db
from app.models.session import UserSession

router = APIRouter(prefix="/survey", tags=["survey"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class SurveyRequest(BaseModel):
    user_id: str
    course_id: int
    skill_level: Literal[1, 2, 3]          # 1=beginner, 2=intermediate, 3=advanced
    learning_pace: Literal["slow", "moderate", "fast"]
    goals: str                              # What they want to achieve
    interests: list[str]                    # e.g. ["movies", "cricket"]
    preferred_examples: str                 # For personalized teaching


class SurveyResponse(BaseModel):
    success: bool
    initial_rl_state: dict
    welcome_message: str


# ── Routes ────────────────────────────────────────────────────────

@router.post("/", response_model=SurveyResponse)
async def submit_survey(
    req: SurveyRequest, db: AsyncSession = Depends(get_db)
):
    """
    Submit pre-course survey.
    Returns initial RL state vector used by the adaptive tutor.
    """
    # Calculate initial RL state from survey
    initial_rl_state = _calculate_initial_rl_state(req)

    # Build personalized welcome message in Tanglish
    welcome = _build_welcome_message(req)

    # Save survey results to session if it exists
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == req.user_id,
            UserSession.course_id == req.course_id,
        )
    )
    session = result.scalar_one_or_none()
    if session:
        session.survey_results_json = json.dumps(req.model_dump())
        session.knowledge_state_json = json.dumps(initial_rl_state)
        await db.commit()

    return SurveyResponse(
        success=True,
        initial_rl_state=initial_rl_state,
        welcome_message=welcome,
    )


@router.get("/{user_id}/{course_id}")
async def get_survey(
    user_id: str, course_id: int, db: AsyncSession = Depends(get_db)
):
    """Get existing survey results for this user+course."""
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.course_id == course_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session or not session.survey_results_json:
        return {"completed": False}

    return {
        "completed": True,
        "survey": json.loads(session.survey_results_json),
    }


# ── Helpers ───────────────────────────────────────────────────────

def _calculate_initial_rl_state(req: SurveyRequest) -> dict:
    """
    Convert survey answers into RL state vector.
    This initializes the Q-Learning agent's understanding of the student.
    """
    skill_map = {1: 0.1, 2: 0.5, 3: 0.9}
    pace_map = {"slow": 0.2, "moderate": 0.5, "fast": 0.8}

    return {
        "skill_level": skill_map[req.skill_level],
        "attention_score": 0.7,             # Start optimistic
        "topic_difficulty": 0.3,            # Start easy
        "learning_pace": pace_map[req.learning_pace],
        "preferred_style": "balanced",      # Updated by RL over time
        "interests": req.interests,
        "preferred_examples": req.preferred_examples,
        # Q-table initialized empty — RL fills this over sessions
        "q_table": {},
        "epsilon": 0.3,                     # Explore more at start
        "total_interactions": 0,
    }


def _build_welcome_message(req: SurveyRequest) -> str:
    """Build a Tanglish welcome message based on survey answers."""
    skill_labels = {1: "beginner", 2: "intermediate", 3: "advanced"}
    skill = skill_labels[req.skill_level]

    msg = (
        f"Vanakkam! Ungaloda survey padichen. "
        f"Neenga {skill} level la irukkeenga, "
    )

    if req.interests:
        interest = req.interests[0]
        msg += f"ungalukku {interest} pudikum nu theriyum — "
        msg += f"adheh use panni examples solren! "

    if req.skill_level == 1:
        msg += "Naama simple ah irundhu slowly start pannalam. Bayapadaadha! "
    elif req.skill_level == 2:
        msg += "Ungalukku basics theriyum, so naama deeper ah pogalam. "
    else:
        msg += "Neenga already expert — naama advanced topics paarkalamey! "

    msg += "Ready-a? Bismillah — let's start!"
    return msg
