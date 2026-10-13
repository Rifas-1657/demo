"""
app/ws/gateway.py

WebSocket gateway for /ws/book — B1 version.

Authentication flow (B1):
  1. Client connects → server waits up to ws_auth_timeout seconds
  2. Client sends auth_ticket frame as the VERY FIRST frame
  3. Server validates ticket (hashed, single-use, 30s TTL, origin-bound)
  4. Server replies auth_ok {userId, role} or auth_error {code, message}
  5. On auth_error → server closes connection (code 4001)
  6. On timeout with no auth_ticket → server closes (code 4002)
  7. Any application frame received before auth_ok is silently dropped

Responsibilities:
  - One WebSocket per reader tab (one MockBookService per connection)
  - sessionId handshake: client sends start_page, server replies session_started
  - Resume by last seq: tracked per connection
  - Heartbeat: responds to ping with pong
  - Frame validation: every inbound frame goes through parse_client_event()
    Invalid frames → error event, connection stays alive
  - Backpressure-safe send queue: asyncio.Queue drains to websocket.send_text()
  - Graceful cleanup on disconnect or error
  - Never sends stack traces to clients
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.ticket import consume_ticket
from app.config import get_settings
from app.contracts.models import (
    AuthErrorEvent,
    AuthErrorPayload,
    AuthOkEvent,
    AuthOkPayload,
    AuthTicketEvent,
    ErrorEvent,
    ErrorPayload,
    PongEvent,
    PongPayload,
)
from app.contracts.validate import AuthTicketEvent as AuthTicketEventType
from app.contracts.validate import ParseError, parse_client_event
from app.db.database import AsyncSessionLocal
from app.db.models import User
from app.services.mock_book_service import MockBookService

log = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Send queue (backpressure-safe)
# ---------------------------------------------------------------------------

class _SendQueue:
    """Drains a queue of JSON dicts to the WebSocket without blocking the event loop."""

    def __init__(self, websocket: WebSocket) -> None:
        self._ws = websocket
        self._queue: asyncio.Queue[dict | None] = asyncio.Queue(maxsize=512)
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._drain())

    async def send(self, data: dict) -> None:
        await self._queue.put(data)

    async def close(self) -> None:
        await self._queue.put(None)  # sentinel
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=3.0)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                self._task.cancel()

    async def _drain(self) -> None:
        while True:
            item = await self._queue.get()
            if item is None:
                break
            try:
                await self._ws.send_text(json.dumps(item))
            except Exception:
                break  # connection closed


# ---------------------------------------------------------------------------
# Auth timeout helper
# ---------------------------------------------------------------------------

async def _wait_for_auth_ticket(
    websocket: WebSocket,
    timeout: float,
) -> str | None:
    """
    Wait for the first text frame. If it's an auth_ticket, return the raw ticket.
    Returns None if timeout or wrong frame type.
    """
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=timeout)
    except asyncio.TimeoutError:
        return None
    except Exception:
        return None

    try:
        data = json.loads(raw)
    except Exception:
        return None

    if isinstance(data, dict) and data.get("type") == "auth_ticket":
        payload = data.get("payload", {})
        ticket = payload.get("ticket")
        if isinstance(ticket, str) and ticket:
            return ticket
    return None


# ---------------------------------------------------------------------------
# Connection handler
# ---------------------------------------------------------------------------

async def book_ws_handler(websocket: WebSocket) -> None:
    """Main WebSocket handler for /ws/book."""
    await websocket.accept()
    log.info("WS connected: %s", websocket.client)

    # ----------------------------------------------------------------
    # B1 Auth: wait for auth_ticket as the first frame
    # ----------------------------------------------------------------
    origin = websocket.headers.get("origin", "")
    raw_ticket = await _wait_for_auth_ticket(
        websocket, timeout=settings.ws_auth_timeout
    )

    if raw_ticket is None:
        log.warning("WS auth timeout or invalid first frame from %s", websocket.client)
        try:
            # Send auth_error then close
            err = AuthErrorEvent(
                seq=0,
                payload=AuthErrorPayload(code="auth_timeout", message="No auth_ticket received"),
            )
            await websocket.send_text(json.dumps(err.model_dump(mode="json")))
        except Exception:
            pass
        await websocket.close(code=4002, reason="auth timeout")
        return

    # Validate ticket against DB
    async with AsyncSessionLocal() as db:
        user: User | None = await consume_ticket(db, raw_ticket, origin)

    if user is None:
        log.warning("WS invalid ticket from %s", websocket.client)
        try:
            err = AuthErrorEvent(
                seq=0,
                payload=AuthErrorPayload(
                    code="auth_failed", message="Invalid or expired ticket"
                ),
            )
            await websocket.send_text(json.dumps(err.model_dump(mode="json")))
        except Exception:
            pass
        await websocket.close(code=4001, reason="auth failed")
        return

    # Auth succeeded — send auth_ok
    auth_ok = AuthOkEvent(
        seq=0,
        payload=AuthOkPayload(userId=user.id, role=user.role),  # type: ignore[arg-type]
    )
    try:
        await websocket.send_text(json.dumps(auth_ok.model_dump(mode="json")))
    except Exception:
        log.warning("WS could not send auth_ok to %s", websocket.client)
        return

    log.info("WS authenticated: user=%s role=%s client=%s", user.id, user.role, websocket.client)

    # ----------------------------------------------------------------
    # Set up send queue and book service
    # ----------------------------------------------------------------
    queue = _SendQueue(websocket)
    queue.start()

    async def send(data: dict) -> None:
        await queue.send(data)

    service = MockBookService(
        send=send,
        user_id=user.id,
        token_ms=settings.mock_token_ms,
        thinking_ms=settings.mock_thinking_ms,
        answer_token_ms=settings.mock_answer_token_ms,
        code_stream_ms=settings.mock_code_stream_ms,
    )

    # Monotonic seq for error frames (service manages its own)
    conn_seq = 0

    def _next_conn_seq() -> int:
        nonlocal conn_seq
        conn_seq += 1
        return conn_seq

    async def send_error(code: str, message: str, recoverable: bool = True) -> None:
        ev = ErrorEvent(
            seq=_next_conn_seq(),
            sessionId=None,
            ts=int(time.time() * 1000),
            payload=ErrorPayload(code=code, message=message, recoverable=recoverable),
        )
        await send(ev.model_dump(mode="json"))

    try:
        async for raw_message in websocket.iter_text():
            # Parse & validate inbound frame
            try:
                event = parse_client_event(raw_message)
            except ParseError as exc:
                log.debug("Invalid frame: %s", exc.message)
                await send_error("invalid_frame", exc.message, recoverable=True)
                continue
            except Exception:
                log.exception("Unexpected parse error")
                await send_error("invalid_frame", "frame parse error", recoverable=True)
                continue

            etype = event.type

            # Connection-level: ping → pong
            if etype == "ping":
                pong = PongEvent(payload=PongPayload(ts=int(time.time() * 1000)))
                await send(pong.model_dump(mode="json"))
                continue

            # auth_ticket after auth_ok is ignored (re-auth not supported mid-session)
            if etype == "auth_ticket":
                continue

            # Protocol-level events
            p = event.payload

            if etype == "start_page":
                asyncio.create_task(service.handle_start_page(
                    course_id=p.courseId, page_id=p.pageId,
                ))
            elif etype == "pause":
                asyncio.create_task(service.handle_pause(session_id=p.sessionId))
            elif etype == "resume":
                asyncio.create_task(service.handle_resume(session_id=p.sessionId))
            elif etype == "seek":
                asyncio.create_task(service.handle_seek(
                    session_id=p.sessionId,
                    segment_id=p.segmentId,
                    word_index=p.wordIndex,
                ))
            elif etype == "speed":
                asyncio.create_task(service.handle_speed(
                    session_id=p.sessionId, value=p.value,
                ))
            elif etype == "ask_question":
                asyncio.create_task(service.handle_ask_question(
                    session_id=p.sessionId,
                    source=p.source,
                    text=p.text,
                    question_id=p.questionId,
                    context=p.context.model_dump(),
                ))
            elif etype == "run_code":
                asyncio.create_task(service.handle_run_code(
                    course_id=p.courseId,
                    page_id=p.pageId,
                    code=p.code,
                    language=p.language,
                    code_id=p.codeId,
                    stdin=p.stdin,
                    use_sample_input=p.useSampleInput,
                ))
            elif etype == "submit_survey":
                asyncio.create_task(service.handle_submit_survey(
                    course_id=p.courseId, answers=p.answers,
                ))
            elif etype == "audio_in":
                asyncio.create_task(service.handle_audio_in(
                    session_id=p.sessionId, seq=p.seq,
                    mime=p.mime, base64=p.base64, final=p.final,
                ))
            else:
                await send_error("unknown_event", f"Unknown event type: {etype!r}", recoverable=True)

    except WebSocketDisconnect:
        log.info("WS disconnected: user=%s client=%s", user.id, websocket.client)
    except Exception:
        log.exception("WS handler error for user=%s", user.id)
    finally:
        await service.dispose()
        await queue.close()
        log.info("WS cleanup complete for user=%s", user.id)
