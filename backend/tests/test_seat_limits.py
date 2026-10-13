"""
Test seat limit enforcement for signup.
Platform limits: max 4 learners + 1 admin.

Tests use dedicated temporary users and clean up in finally blocks so that
the test session remains clean and deterministic regardless of test order.
"""
import asyncio
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.auth.service import create_invite, count_learner_seats, count_admin_seats, hash_password
from app.db.database import AsyncSessionLocal
from app.db.models import User


pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

async def test_direct_5th_signup_without_invite_rejected(http_client: AsyncClient):
    """Direct signup attempt without valid invite is rejected."""
    resp = await http_client.post(
        "/auth/signup",
        json={
            "email": "intruder@test.com",
            "password": "password123",
            "display_name": "Intruder",
            "invite_token": "fake-token-12345",
        },
    )
    assert resp.status_code == 403
    assert "invalid" in resp.json()["detail"].lower() or "expired" in resp.json()["detail"].lower()


async def test_invalid_invite_rejected(http_client: AsyncClient):
    """Invalid invite token is rejected."""
    resp = await http_client.post(
        "/auth/signup",
        json={
            "email": "test@test.com",
            "password": "password123",
            "display_name": "Test",
            "invite_token": "completely-invalid-token",
        },
    )
    assert resp.status_code == 403
    assert "invalid" in resp.json()["detail"].lower() or "expired" in resp.json()["detail"].lower()


async def test_missing_invite_rejected(http_client: AsyncClient):
    """Missing invite token causes validation error."""
    resp = await http_client.post(
        "/auth/signup",
        json={
            "email": "test@test.com",
            "password": "password123",
            "display_name": "Test",
            # missing invite_token
        },
    )
    assert resp.status_code == 422  # Pydantic validation error


async def test_valid_invite_at_capacity_rejected(
    http_client: AsyncClient,
    app_client,
    admin_user: User,
):
    """Valid invite is rejected when learner capacity is reached."""
    added_user_ids: list[str] = []
    async with AsyncSessionLocal() as db:
        current = await count_learner_seats(db)
        # Fill remaining seats up to the 4-learner limit
        for i in range(4 - current):
            user = User(
                email=f"cap-learner-{i}@test.com",
                display_name=f"Cap Learner {i}",
                role="learner",
                password_hash=hash_password("password123"),
            )
            db.add(user)
            await db.flush()
            added_user_ids.append(user.id)
        await db.commit()

        learner_count = await count_learner_seats(db)
        assert learner_count == 4, f"Expected 4 active learners, got {learner_count}"
        invite_token = await create_invite(db, admin_user.id, role="learner")

    try:
        resp = await http_client.post(
            "/auth/signup",
            json={
                "email": "learner5@test.com",
                "password": "password123",
                "display_name": "Learner 5",
                "invite_token": invite_token,
            },
        )

        # Should be rejected due to seat limit
        assert resp.status_code == 403
        detail = resp.json()["detail"].lower()
        assert "seat" in detail or "limit" in detail or "max" in detail
    finally:
        # Clean up temporary learners
        async with AsyncSessionLocal() as db:
            for uid in added_user_ids:
                u = await db.get(User, uid)
                if u:
                    await db.delete(u)
            await db.commit()


async def test_concurrent_signups_respect_limit(
    http_client: AsyncClient,
    app_client,
    admin_user: User,
):
    """Concurrent signups at capacity are serialized and all rejected."""
    added_user_ids: list[str] = []
    async with AsyncSessionLocal() as db:
        current = await count_learner_seats(db)
        for i in range(4 - current):
            user = User(
                email=f"conc-learner-{i}@test.com",
                display_name=f"Concurrent Learner {i}",
                role="learner",
                password_hash=hash_password("password123"),
            )
            db.add(user)
            await db.flush()
            added_user_ids.append(user.id)
        await db.commit()

        learner_count = await count_learner_seats(db)
        assert learner_count == 4, f"Expected 4 learners for concurrency test, got {learner_count}"
        invite1 = await create_invite(db, admin_user.id, role="learner")
        invite2 = await create_invite(db, admin_user.id, role="learner")
        invite3 = await create_invite(db, admin_user.id, role="learner")

    async def signup(email: str, invite_token: str):
        return await http_client.post(
            "/auth/signup",
            json={
                "email": email,
                "password": "password123",
                "display_name": email.split("@")[0],
                "invite_token": invite_token,
            },
        )

    try:
        results = await asyncio.gather(
            signup("concurrent1@test.com", invite1),
            signup("concurrent2@test.com", invite2),
            signup("concurrent3@test.com", invite3),
            return_exceptions=False,
        )

        success_count = sum(1 for r in results if r.status_code == 200)
        rejected_count = sum(1 for r in results if r.status_code == 403)

        assert rejected_count == 3, f"Expected 3 rejections at capacity, got {rejected_count}"
        assert success_count == 0, f"Expected 0 successes at capacity, got {success_count}"
    finally:
        async with AsyncSessionLocal() as db:
            for uid in added_user_ids:
                u = await db.get(User, uid)
                if u:
                    await db.delete(u)
            await db.commit()


async def test_admin_seat_enforcement(
    http_client: AsyncClient,
    app_client,
    admin_user: User,
):
    """Only one admin seat is allowed."""
    async with AsyncSessionLocal() as db:
        admin_count = await count_admin_seats(db)
        assert admin_count == 1

        admin_invite = await create_invite(db, admin_user.id, role="admin")

    resp = await http_client.post(
        "/auth/signup",
        json={
            "email": "admin2@test.com",
            "password": "password123",
            "display_name": "Admin 2",
            "invite_token": admin_invite,
        },
    )

    assert resp.status_code == 403
    detail = resp.json()["detail"].lower()
    assert "admin" in detail


async def test_seat_counting_ignores_inactive_users(
    app_client,
    admin_user: User,
):
    """Seat counting only includes active users."""
    inactive_id = None
    async with AsyncSessionLocal() as db:
        before_count = await count_learner_seats(db)

        # Add an inactive learner
        inactive = User(
            email="inactive-seat-test@test.com",
            display_name="Inactive Seat Test",
            role="learner",
            password_hash=hash_password("password"),
            is_active=False,
        )
        db.add(inactive)
        await db.commit()
        inactive_id = inactive.id

    try:
        async with AsyncSessionLocal() as db:
            # Active count must not change
            after_count = await count_learner_seats(db)
            assert after_count == before_count, (
                f"Active learner count changed unexpectedly: {before_count} -> {after_count}"
            )
            assert after_count >= 0, "Count must be non-negative"
    finally:
        if inactive_id:
            async with AsyncSessionLocal() as db:
                u = await db.get(User, inactive_id)
                if u:
                    await db.delete(u)
                await db.commit()
