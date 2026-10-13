"""
tests/conftest.py — pytest fixtures (B1).

Strategy:
  - session-scoped sync TestClient runs app lifespan ONCE → creates bookey_dev.db
    with all B1 tables + seed data (admin + bootstrap invite).
  - All user/token fixtures are pytest_asyncio session-scoped; they read from
    AsyncSessionLocal (the real app DB) and share one event loop per session
    (asyncio_default_fixture_loop_scope = session in pytest.ini).
  - All http_client fixtures depend on app_client to guarantee lifespan ran first.
  - WS tests use the same TestClient session fixture.
"""
from __future__ import annotations

import io
import os
import sys

# Force UTF-8 output on Windows (prevents UnicodeEncodeError from structlog/colorama
# when structured log output contains non-ASCII characters like arrows or bullets).
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
# Disable structlog colors in test mode to avoid colorama ANSI handling on Windows
os.environ.setdefault("NO_COLOR", "1")

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.auth.service import create_access_token, hash_password
from app.auth.ticket import issue_ticket
from app.db.database import AsyncSessionLocal
from app.db.models import User
from app.main import app



# ---------------------------------------------------------------------------
# App bootstrap — runs lifespan ONCE per session
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def app_client():
    """
    Sync TestClient that runs the FastAPI lifespan on enter.
    Creates bookey_dev.db with all tables + seeds admin user + invite.
    All fixtures that touch the DB depend on this (directly or transitively).
    """
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


# ---------------------------------------------------------------------------
# User fixtures — async session-scoped, shared event loop via pytest.ini setting
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session")
async def admin_user(app_client) -> User:
    """Fetch the seeded dev admin from the real app DB."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == "admin@bookey.dev")
        )
        return result.scalar_one()


@pytest_asyncio.fixture(scope="session")
async def learner_user(app_client, admin_user: User) -> User:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == "learner@bookey.test")
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing
        user = User(
            email="learner@bookey.test",
            display_name="Test Learner",
            role="learner",
            password_hash=hash_password("learner-test-pass"),
        )
        db.add(user)
        await db.commit()
        return user


@pytest_asyncio.fixture(scope="session")
async def learner2_user(app_client, admin_user: User) -> User:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == "learner2@bookey.test")
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing
        user = User(
            email="learner2@bookey.test",
            display_name="Learner Two",
            role="learner",
            password_hash=hash_password("learner2-test-pass"),
        )
        db.add(user)
        await db.commit()
        return user


# ---------------------------------------------------------------------------
# Token fixtures (sync — just call create_access_token)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def admin_token(admin_user: User) -> str:
    return create_access_token(admin_user.id, admin_user.role)


@pytest.fixture(scope="session")
def learner_token(learner_user: User) -> str:
    return create_access_token(learner_user.id, learner_user.role)


@pytest.fixture(scope="session")
def learner2_token(learner2_user: User) -> str:
    return create_access_token(learner2_user.id, learner2_user.role)


# ---------------------------------------------------------------------------
# WS client (module-scoped — reuses app_client so lifespan is already done)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def ws_client(app_client):
    return app_client


# ---------------------------------------------------------------------------
# Async HTTP clients (function-scoped)
# All depend on app_client to ensure DB is set up before first request.
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def http_client(app_client):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def auth_http_client(app_client, learner_token: str):
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {learner_token}"},
    ) as client:
        yield client


@pytest_asyncio.fixture
async def admin_http_client(app_client, admin_token: str):
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {admin_token}"},
    ) as client:
        yield client
