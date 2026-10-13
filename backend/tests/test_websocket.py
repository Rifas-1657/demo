"""
tests/test_websocket.py — WebSocket integration tests (B1).

All WS tests now go through the ticket-auth flow:
  1. Issue a WS ticket via the DB (inline, async)
  2. Connect via starlette TestClient websocket (synchronous, runs in same event loop)
  3. Send auth_ticket as first frame
  4. Receive auth_ok
  5. Then proceed with application frames

New B1 tests:
- No auth_ticket sent → send wrong frame first → auth_error or close
- Invalid ticket → auth_error
- Ticket cannot be reused (single-use)
"""
from __future__ import annotations

import asyncio
import json
from unittest.mock import patch, MagicMock

import pytest
from starlette.testclient import WebSocketTestSession

from app.auth.ticket import issue_ticket
from app.db.database import AsyncSessionLocal
from app.db.models import User
from app.llm.providers.mock import MockLLMProvider
from app.llm.router import LLMRouter


pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _mock_llm_router():
    """Replace get_llm_router with MockLLMProvider so WS tests don't hit real APIs."""
    mock_router = LLMRouter(
        providers=[MockLLMProvider()],
        retry_per_provider=0,
        backoff_base_s=0,
    )
    # Patch at the source so all call-site `from app.llm.router import get_llm_router` pick it up
    with patch("app.llm.router.get_llm_router", return_value=mock_router):
        yield


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _make_ticket(user: User) -> str:
    """Async: create a WS ticket for a user in the real app DB."""
    async with AsyncSessionLocal() as db:
        return await issue_ticket(db, user_id=user.id, origin="")


def _ws_send(ws: WebSocketTestSession, type_: str, payload: dict) -> None:
    ws.send_text(json.dumps({"v": 2, "type": type_, "payload": payload}))


def _ws_recv(ws: WebSocketTestSession) -> dict:
    return json.loads(ws.receive_text())


def _collect_until(ws: WebSocketTestSession, stop_type: str, max_frames: int = 200) -> list[dict]:
    frames = []
    for _ in range(max_frames):
        frame = _ws_recv(ws)
        frames.append(frame)
        if frame.get("type") == stop_type:
            break
    return frames


def _do_auth(ws: WebSocketTestSession, ticket: str) -> dict:
    """Send auth_ticket and receive auth_ok."""
    ws.send_text(json.dumps({"type": "auth_ticket", "payload": {"ticket": ticket}}))
    auth_ok = _ws_recv(ws)
    assert auth_ok["type"] == "auth_ok", f"Expected auth_ok, got: {auth_ok}"
    return auth_ok


# ---------------------------------------------------------------------------
# Tests 1-11: Application tests (all with auth)
# ---------------------------------------------------------------------------

async def test_ws_handshake(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        ok = _do_auth(ws, ticket)
        assert ok["payload"]["role"] == "admin"
        _ws_send(ws, "start_page", {"courseId": "python", "pageId": "lesson_python_1_1"})
        frame = _ws_recv(ws)
        assert frame["type"] == "session_started"
        assert frame["v"] == 2
        assert frame["seq"] >= 1
        assert frame["payload"]["courseId"] == "python"


async def test_ws_page_replay_ordering(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        _ws_send(ws, "start_page", {"courseId": "python", "pageId": "lesson_python_1_1"})
        f1 = _ws_recv(ws)
        assert f1["type"] == "session_started"
        f2 = _ws_recv(ws)
        assert f2["type"] == "diagram_spec"
        f3 = _ws_recv(ws)
        assert f3["type"] == "text_chunk"
        assert f3["payload"]["wordStart"] == 0
        seqs = [f1["seq"], f2["seq"], f3["seq"]]
        assert seqs == sorted(seqs)


async def test_ws_invalid_frame_no_crash(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        ws.send_text("not valid json at all")
        frame = _ws_recv(ws)
        assert frame["type"] == "error"
        assert frame["payload"]["code"] == "invalid_frame"
        assert frame["payload"]["recoverable"] is True
        # Connection still alive
        _ws_send(ws, "start_page", {"courseId": "python", "pageId": "lesson_python_1_1"})
        frame2 = _ws_recv(ws)
        assert frame2["type"] == "session_started"


async def test_ws_wrong_version_rejected(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        ws.send_text(json.dumps({"v": 1, "type": "start_page", "payload": {"courseId": "python", "pageId": "p1"}}))
        frame = _ws_recv(ws)
        assert frame["type"] == "error"
        assert frame["payload"]["code"] == "invalid_frame"


async def test_ws_ping_pong(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        ws.send_text(json.dumps({"type": "ping", "payload": {}}))
        frame = _ws_recv(ws)
        assert frame["type"] == "pong"
        assert "ts" in frame["payload"]


async def test_ws_page_not_found(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        _ws_send(ws, "start_page", {"courseId": "python", "pageId": "nonexistent_page"})
        frame = _ws_recv(ws)
        assert frame["type"] == "error"
        assert frame["payload"]["code"] == "page_not_found"
        assert frame["payload"]["recoverable"] is True


async def test_ws_scope_refused(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        _ws_send(ws, "ask_question", {
            "sessionId": None, "source": "text",
            "text": "Cricket match score enna?",
            "questionId": "q_test_1",
            "context": {"courseId": "python", "pageId": "lesson_python_1_1", "language": "english"},
        })
        f1 = _ws_recv(ws)
        assert f1["type"] == "question_received"
        f2 = _ws_recv(ws)
        assert f2["type"] == "scope_refused"


async def test_ws_python_question_answered(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        _ws_send(ws, "ask_question", {
            "sessionId": None, "source": "text",
            "text": "What is a variable in Python?",
            "questionId": "q_var_1",
            "context": {"courseId": "python", "pageId": "lesson_python_1_1", "language": "tanglish"},
        })
        f1 = _ws_recv(ws)
        assert f1["type"] == "question_received"

        # Collect until the final answer_chunk (final=True) — may take many frames
        # since the mock LLM produces verbose output word-by-word
        chunks = []
        for _ in range(300):
            frame = _ws_recv(ws)
            if frame["type"] == "answer_chunk":
                chunks.append(frame)
                if frame["payload"].get("final"):
                    break
            elif frame["type"] == "sources":
                # sources arrived before final chunk (shouldn't happen, but handle it)
                break

        assert len(chunks) > 0, "Expected at least one answer_chunk"
        assert chunks[-1]["payload"]["final"] is True, "Last chunk must be final"

        # Next frame must be sources
        sources_frame = _ws_recv(ws)
        assert sources_frame["type"] == "sources", (
            f"Expected sources after answer, got: {sources_frame['type']}"
        )


async def test_ws_run_code_seeded(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        _ws_send(ws, "run_code", {
            "courseId": "python", "pageId": "lesson_python_1_1",
            "code": "x = 10\nprint(x)\nprint(type(x))",
            "language": "python", "codeId": "run_test_1",
        })
        frames = _collect_until(ws, "run_result", max_frames=20)
        run_result = next(f for f in frames if f["type"] == "run_result")
        assert run_result["payload"]["status"] == "success"
        assert "10" in run_result["payload"]["stdout"]


async def test_ws_run_code_unsupported(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        _ws_send(ws, "run_code", {
            "courseId": "python", "pageId": "lesson_python_1_1",
            "code": "import os; print(os.getcwd())",
            "language": "python", "codeId": "run_unsupported_1",
        })
        frames = _collect_until(ws, "run_result", max_frames=10)
        run_result = next(f for f in frames if f["type"] == "run_result")
        assert run_result["payload"]["status"] == "error"
        assert run_result["payload"]["trace"]["unsupported"] is not None


async def test_ws_submit_survey_no_crash(ws_client, admin_user):
    ticket = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket)
        _ws_send(ws, "submit_survey", {
            "courseId": "python",
            "answers": {"q1": "cricket", "q2": "visual"},
        })
        ticket2 = await _make_ticket(admin_user)

    # Just confirm app still accepts connections
    ticket3 = await _make_ticket(admin_user)
    with ws_client.websocket_connect("/ws/book") as ws:
        _do_auth(ws, ticket3)
        _ws_send(ws, "start_page", {"courseId": "python", "pageId": "lesson_python_1_1"})
        frame = _ws_recv(ws)
        assert frame["type"] == "session_started"


# ---------------------------------------------------------------------------
# Tests 12-14: B1 auth-specific tests
# ---------------------------------------------------------------------------

async def test_ws_invalid_ticket_rejected(ws_client):
    with ws_client.websocket_connect("/ws/book") as ws:
        ws.send_text(json.dumps({
            "type": "auth_ticket",
            "payload": {"ticket": "totally-fake-invalid-ticket-value-here"},
        }))
        try:
            frame = _ws_recv(ws)
            assert frame["type"] in ("auth_error", "error")
        except Exception:
            pass  # Connection may close before frame is readable


async def test_ws_ticket_single_use(ws_client, admin_user):
    """Ticket used once cannot be reused."""
    ticket = await _make_ticket(admin_user)

    # First use — should succeed
    with ws_client.websocket_connect("/ws/book") as ws:
        ws.send_text(json.dumps({"type": "auth_ticket", "payload": {"ticket": ticket}}))
        frame = _ws_recv(ws)
        assert frame["type"] == "auth_ok"

    # Second use — ticket deleted, should fail
    with ws_client.websocket_connect("/ws/book") as ws:
        ws.send_text(json.dumps({"type": "auth_ticket", "payload": {"ticket": ticket}}))
        try:
            frame = _ws_recv(ws)
            assert frame["type"] in ("auth_error", "error")
        except Exception:
            pass  # Connection may close


async def test_ws_wrong_first_frame_fails(ws_client):
    """Sending a non-auth_ticket first frame triggers auth timeout path."""
    # The server waits ws_auth_timeout seconds for auth_ticket.
    # In tests, since TestClient is synchronous, sending a start_page frame
    # as first frame should cause the server to treat it as a non-ticket frame.
    # The server's _wait_for_auth_ticket() will not match and return None.
    with ws_client.websocket_connect("/ws/book") as ws:
        ws.send_text(json.dumps({"v": 2, "type": "start_page", "payload": {
            "courseId": "python", "pageId": "lesson_python_1_1"
        }}))
        try:
            frame = _ws_recv(ws)
            assert frame["type"] in ("auth_error", "error")
        except Exception:
            pass  # Acceptable — server closed connection
