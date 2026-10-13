"""
IqraBook — Session API routes
POST /sessions        → start or resume a session
GET  /sessions/{id}   → get session details
PUT  /sessions/{id}/progress → update progress
DELETE /sessions/{id} → end session
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import json

from app.db.database import get_db
from app.models.session import UserSession

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    user_id: str
    course_id: int


class UpdateProgressRequest(BaseModel):
    current_topic_index: int
    current_subtopic: Optional[str] = None
    time_spent_delta: int = 0           # seconds to add
    completed_topic_id: Optional[str] = None
    qa_entry: Optional[dict] = None     # {q, a} to add to history


class SessionResponse(BaseModel):
    id: int
    user_id: str
    course_id: int
    current_topic_index: int
    current_subtopic: Optional[str]
    total_time_spent: int
    completed_topics: list[str]
    last_session_at: Optional[str]
    is_resuming: bool  # True if user has previous progress


# ── Routes ────────────────────────────────────────────────────────

@router.post("/", response_model=SessionResponse)
async def start_or_resume_session(
    req: StartSessionRequest, db: AsyncSession = Depends(get_db)
):
    """Start a new session or resume existing one for this user+course."""
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == req.user_id,
            UserSession.course_id == req.course_id,
        )
    )
    session = result.scalar_one_or_none()

    if session:
        # Resume — update timestamp
        session.last_session_at = datetime.utcnow()
        await db.commit()
        await db.refresh(session)
        return _to_response(session, is_resuming=True)
    else:
        # New session
        session = UserSession(
            user_id=req.user_id,
            course_id=req.course_id,
            current_topic_index=0,
            current_subtopic=None,
            knowledge_state_json=json.dumps({}),
            rl_q_table_json=json.dumps({}),
            rl_epsilon=0.2,
            total_time_spent=0,
            completed_topics_json=json.dumps([]),
            qa_history_json=json.dumps([]),
            survey_results_json=json.dumps({}),
            last_session_at=datetime.utcnow(),
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return _to_response(session, is_resuming=False)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get full session state including RL and progress."""
    session = await _get_or_404(session_id, db)
    return _to_response(session, is_resuming=True)


@router.put("/{session_id}/progress")
async def update_progress(
    session_id: int,
    req: UpdateProgressRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update session progress — called every 60s and on topic completion."""
    session = await _get_or_404(session_id, db)

    session.current_topic_index = req.current_topic_index
    session.current_subtopic = req.current_subtopic
    session.total_time_spent += req.time_spent_delta
    session.updated_at = datetime.utcnow()

    # Add completed topic
    if req.completed_topic_id:
        completed = json.loads(session.completed_topics_json or "[]")
        if req.completed_topic_id not in completed:
            completed.append(req.completed_topic_id)
            session.completed_topics_json = json.dumps(completed)

    # Add Q&A to sliding window (keep last 10)
    if req.qa_entry:
        history = json.loads(session.qa_history_json or "[]")
        history.append(req.qa_entry)
        session.qa_history_json = json.dumps(history[-10:])  # sliding window

    await db.commit()
    return {"success": True, "updated_at": session.updated_at.isoformat()}


@router.delete("/{session_id}")
async def end_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Mark session as ended (timestamp + cleanup)."""
    session = await _get_or_404(session_id, db)
    session.last_session_at = datetime.utcnow()
    await db.commit()
    return {"success": True}


# ── Helpers ───────────────────────────────────────────────────────

async def _get_or_404(session_id: int, db: AsyncSession) -> UserSession:
    result = await db.execute(
        select(UserSession).where(UserSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _to_response(session: UserSession, is_resuming: bool) -> dict:
    completed = json.loads(session.completed_topics_json or "[]")
    return {
        "id": session.id,
        "user_id": session.user_id,
        "course_id": session.course_id,
        "current_topic_index": session.current_topic_index,
        "current_subtopic": session.current_subtopic,
        "total_time_spent": session.total_time_spent,
        "completed_topics": completed,
        "last_session_at": session.last_session_at.isoformat()
        if session.last_session_at
        else None,
        "is_resuming": is_resuming,
    }
