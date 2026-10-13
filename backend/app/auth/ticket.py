"""
app/auth/ticket.py — Short-lived single-use WS ticket.

Flow:
  1. Authenticated client calls POST /api/ws-ticket
  2. Server generates a random 32-byte ticket, stores SHA-256 hash in ws_tickets table
     with 30s TTL, bound to the calling user and allowed origin
  3. Client opens WebSocket and sends { v:2, type:"auth_ticket", payload:{ticket} }
     as the FIRST frame
  4. Server hashes the received ticket, looks it up, checks expiry + origin,
     deletes the row (single-use), returns auth_ok or auth_error
"""
from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, WsTicket

log = logging.getLogger(__name__)

TICKET_TTL_SECONDS = 30


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


async def issue_ticket(
    db: AsyncSession,
    user_id: str,
    origin: str,
) -> str:
    """Generate a WS ticket, store hash in DB. Returns the raw ticket."""
    raw = secrets.token_urlsafe(32)
    ticket_hash = _sha256(raw)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=TICKET_TTL_SECONDS)

    ticket = WsTicket(
        ticket_hash=ticket_hash,
        user_id=user_id,
        origin=origin,
        expires_at=expires_at,
    )
    db.add(ticket)
    await db.commit()
    return raw


async def consume_ticket(
    db: AsyncSession,
    raw_ticket: str,
    origin: str,
) -> User | None:
    """
    Validate a WS ticket:
    - Looks up hash
    - Checks expiry
    - Checks origin (relaxed in dev: allows empty origin)
    - Deletes row on first use (single-use)
    Returns the User if valid, None otherwise.
    """
    ticket_hash = _sha256(raw_ticket)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(WsTicket).where(
            WsTicket.ticket_hash == ticket_hash,
            WsTicket.expires_at > now,
        )
    )
    ticket = result.scalar_one_or_none()
    if ticket is None:
        log.warning("WS ticket not found or expired: hash=%s...", ticket_hash[:8])
        return None

    # Origin check: allow empty origin (e.g. native apps, curl) and matching origin
    if ticket.origin and origin and ticket.origin != origin:
        log.warning(
            "WS ticket origin mismatch: expected=%s got=%s", ticket.origin, origin
        )
        # Delete anyway to prevent reuse
        await db.delete(ticket)
        await db.commit()
        return None

    # Delete ticket (single-use)
    user_id = ticket.user_id
    await db.delete(ticket)
    await db.commit()

    # Load user
    user_result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
    )
    return user_result.scalar_one_or_none()
