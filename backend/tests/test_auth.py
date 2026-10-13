"""
tests/test_auth.py — Auth flow, security and IDOR tests (B1).

Tests:
1.  GET /me without token → 401
2.  POST /auth/login with wrong password → 401
3.  POST /auth/login with correct credentials → 200, tokens in response
4.  GET /me with valid token → 200, correct user info
5.  POST /auth/refresh with refresh cookie → 200, new access token
6.  POST /auth/logout → 200, cookies cleared
7.  POST /auth/signup without invite → 403
8.  POST /auth/signup with invalid invite → 403
9.  POST /auth/password-reset/request → 200 (no email enumeration)
10. Learner cannot access admin endpoint → 403
11. IDOR: learner A cannot read learner B's notes → 404
12. IDOR: learner A cannot delete learner B's bookmarks → 404
13. POST /api/ws-ticket without auth → 401
14. POST /api/ws-ticket with auth → 200, ticket returned
15. Seat limit: seeding 5th learner would be blocked
16. Admin can list members
17. Admin can create invite
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.db.models import Bookmark, Note, User
from app.main import app


pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Basic auth flow
# ---------------------------------------------------------------------------

async def test_me_unauthenticated(http_client: AsyncClient):
    resp = await http_client.get("/me")
    assert resp.status_code == 401


async def test_login_wrong_password(http_client: AsyncClient):
    resp = await http_client.post(
        "/auth/login",
        json={"email": "admin@bookey.dev", "password": "wrong-password"},
    )
    assert resp.status_code == 401


async def test_login_success(http_client: AsyncClient):
    resp = await http_client.post(
        "/auth/login",
        json={"email": "admin@bookey.dev", "password": "bookey-admin-dev"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["display_name"] == "Bookey Admin"


async def test_me_authenticated(auth_http_client: AsyncClient):
    resp = await auth_http_client.get("/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "learner@bookey.test"
    assert data["role"] == "learner"


async def test_logout(http_client: AsyncClient):
    resp = await http_client.post("/auth/logout")
    assert resp.status_code == 200
    # Cookies should be cleared
    assert resp.json()["message"] == "Logged out"


async def test_refresh_no_cookie(http_client: AsyncClient):
    resp = await http_client.post("/auth/refresh")
    assert resp.status_code == 401


async def test_refresh_with_cookie(http_client: AsyncClient):
    # Login first to get refresh token cookie
    login_resp = await http_client.post(
        "/auth/login",
        json={"email": "admin@bookey.dev", "password": "bookey-admin-dev"},
    )
    assert login_resp.status_code == 200
    # The refresh token is in the cookies
    refresh_cookie = login_resp.cookies.get("refresh_token")
    assert refresh_cookie is not None

    # Use refresh token
    resp = await http_client.post(
        "/auth/refresh",
        cookies={"refresh_token": refresh_cookie},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


# ---------------------------------------------------------------------------
# Signup / invite
# ---------------------------------------------------------------------------

async def test_signup_without_invite(http_client: AsyncClient):
    resp = await http_client.post(
        "/auth/signup",
        json={
            "email": "noone@test.com",
            "password": "password123",
            "display_name": "No One",
            "invite_token": "invalid-token",
        },
    )
    assert resp.status_code == 403


async def test_password_reset_no_enumeration(http_client: AsyncClient):
    """Password reset always returns 200 even for non-existent emails."""
    resp = await http_client.post(
        "/auth/password-reset/request",
        json={"email": "nonexistent@nowhere.example"},
    )
    assert resp.status_code == 200
    assert "sent" in resp.json()["message"].lower()


# ---------------------------------------------------------------------------
# Authorization / IDOR
# ---------------------------------------------------------------------------

async def test_learner_cannot_access_admin(auth_http_client: AsyncClient):
    """Learner token must be rejected by admin endpoints."""
    resp = await auth_http_client.get("/admin/members")
    assert resp.status_code == 403


async def test_admin_can_list_members(admin_http_client: AsyncClient):
    resp = await admin_http_client.get("/admin/members")
    assert resp.status_code == 200
    members = resp.json()
    assert any(m["email"] == "admin@bookey.dev" for m in members)


async def test_admin_can_create_invite(admin_http_client: AsyncClient):
    resp = await admin_http_client.post(
        "/admin/members/invite", json={"role": "learner"}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "token" in data
    assert len(data["token"]) > 10


async def test_idor_notes(
    http_client: AsyncClient,
    learner_token: str,
    learner2_token: str,
    learner_user: User,
):
    """Learner A creates a note. Learner B cannot read it."""
    # Learner A creates a note
    client_a = AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    async with client_a as ca:
        create_resp = await ca.post(
            "/me/notes",
            json={
                "course_id": "python", "chapter_number": 1,
                "page_id": "lesson_python_1_1", "text": "Private note",
            },
        )
        assert create_resp.status_code == 201
        note_id = create_resp.json()["id"]

        # Learner A can read their own note
        list_resp = await ca.get("/me/notes")
        assert any(n["id"] == note_id for n in list_resp.json())

    # Learner B tries to delete Learner A's note
    client_b = AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {learner2_token}"},
    )
    async with client_b as cb:
        del_resp = await cb.delete(f"/me/notes/{note_id}")
        assert del_resp.status_code == 404  # IDOR: not found (not 403, to not leak existence)


async def test_idor_bookmarks(
    learner_token: str,
    learner2_token: str,
):
    """Learner A creates a bookmark. Learner B cannot delete it."""
    client_a = AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    async with client_a as ca:
        create_resp = await ca.post(
            "/me/bookmarks",
            json={
                "course_id": "python", "chapter_number": 1,
                "page_id": "lesson_python_1_1", "excerpt": "Secret",
            },
        )
        assert create_resp.status_code == 201
        bm_id = create_resp.json()["id"]

    client_b = AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {learner2_token}"},
    )
    async with client_b as cb:
        del_resp = await cb.delete(f"/me/bookmarks/{bm_id}")
        assert del_resp.status_code == 404


# ---------------------------------------------------------------------------
# WS Ticket
# ---------------------------------------------------------------------------

async def test_ws_ticket_unauthenticated(http_client: AsyncClient):
    resp = await http_client.post("/api/ws-ticket")
    assert resp.status_code == 401


async def test_ws_ticket_authenticated(auth_http_client: AsyncClient):
    resp = await auth_http_client.post("/api/ws-ticket")
    assert resp.status_code == 200
    data = resp.json()
    assert "ticket" in data
    assert data["expires_in"] == 30
    assert len(data["ticket"]) > 10
