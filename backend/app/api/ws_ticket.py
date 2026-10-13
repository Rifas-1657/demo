"""
app/api/ws_ticket.py — POST /api/ws-ticket

Issues a short-lived (30 s) single-use WS auth ticket for the authenticated user.
Rate limited to 20/minute per user.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.ticket import issue_ticket
from app.db.database import get_db
from app.db.models import User
from app.middleware.rate_limit import limiter

router = APIRouter(tags=["ws"])


class WsTicketResponse(BaseModel):
    ticket: str
    expires_in: int = 30  # seconds


@router.post("/api/ws-ticket", response_model=WsTicketResponse)
@limiter.limit("20/minute")
async def get_ws_ticket(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WsTicketResponse:
    """Issue a single-use WS auth ticket. Must be used within 30 seconds."""
    origin = request.headers.get("origin", "")
    raw_ticket = await issue_ticket(db, user_id=current_user.id, origin=origin)
    return WsTicketResponse(ticket=raw_ticket)
