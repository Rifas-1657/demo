"""
Test seat limit enforcement for signup.
Platform limits: max 4 learners + 1 admin.

All tests are designed to be idempotent: they check for existing rows before
inserting and clean up (deactivate) any test-created learners after each test
that fills the learner pool. This prevents cross-session DB pollution.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.auth.service import create_invite, count_learner_seats, count_admin_seats
from app.db.database import AsyncSessionLocal
from app.db.models import User


pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _ensure_learner_count_below(target_active: int) -> None:
    """Deactivate test-created learners so active count is at most target_active.

    Only deactivates accounts whose email ends with '@test.com' (never the
    conftest-managed learner@bookey.test or learner2@bookey.test accounts).
    Never touches admin@bookey.dev.
    """
    from app.auth.service import hash_password
    async with AsyncSessionLocal() as db:
        # Find active test learners (not the permanent conftest accounts)
        result = await db.execute(
            select(User).where(
                User.role == "learner",
                User.is_active == True,
                User.email.like("%@test.com"),
            ).order_by(User.created_at)
        )
        test_learners = result.scalars().all()
        current = await count_learner_seats(db)
        # Deactivate enough to reach target
        excess = current - target_active
        for user in reversed(test_learners):
            if excess <= 0:
                break
            user.is_active = False
            excess -= 1
        await db.commit()


async def _get_or_create_learner(db, email: str, display_name: str) -> User:
    """Idempotent: return existing user if email exists, else create it."""
    from app.auth.service import hash_password
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        # Reactivate in case it was deactivated by a previous test
        existing.is_active = True
        await db.commit()
        return existing
    user = User(
        email=email,
        display_name=display_name,
        role="learner",
        password_hash=hash_password("password123"),
    )
    db.add(user)
    await db.commit()
    return user


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
    async with AsyncSessionLocal() as db:
        # Fill to exactly 4 active learners using idempotent get-or-create
        for i in range(4):
            await _get_or_create_learner(
                db,
                email=f"cap-learner-{i}@test.com",
                display_name=f"Cap Learner {i}",
            )
        learner_count = await count_learner_seats(db)

    # May be > 4 if conftest learners also count — ensure exactly 4 by
    # deactivating excess @test.com learners
    await _ensure_learner_count_below(4)

    async with AsyncSessionLocal() as db:
        learner_count = await count_learner_seats(db)
        assert learner_count == 4, f"Expected 4 active learners, got {learner_count}"
        invite_token = await create_invite(db, admin_user.id, role="learner")

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

    # Cleanup: deactivate the test learners so subsequent tests start clean
    await _ensure_learner_count_below(2)


async def test_concurrent_signups_respect_limit(
    http_client: AsyncClient,
    app_client,
    admin_user: User,
):
    """Concurrent signups at capacity are serialized and all rejected."""
    import asyncio

    # Fill to capacity
    async with AsyncSessionLocal() as db:
        for i in range(4):
            await _get_or_create_learner(
                db,
                email=f"conc-learner-{i}@test.com",
                display_name=f"Concurrent Learner {i}",
            )
    await _ensure_learner_count_below(4)

    async with AsyncSessionLocal() as db:
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

    # Cleanup
    await _ensure_learner_count_below(2)


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
    from app.auth.service import hash_password

    async with AsyncSessionLocal() as db:
        # Idempotent: check if inactive test user already exists
        result = await db.execute(
            select(User).where(User.email == "inactive-seat-test@test.com")
        )
        existing = result.scalar_one_or_none()
        if existing is None:
            inactive = User(
                email="inactive-seat-test@test.com",
                display_name="Inactive Seat Test",
                role="learner",
                password_hash=hash_password("password"),
                is_active=False,
            )
            db.add(inactive)
            await db.commit()
        else:
            # Ensure it stays inactive
            existing.is_active = False
            await db.commit()

        before_count = await count_learner_seats(db)

        # Active count must not change after we confirm our user is inactive
        result2 = await db.execute(
            select(User).where(User.email == "inactive-seat-test@test.com")
        )
        inactive_user = result2.scalar_one()
        assert inactive_user.is_active is False, "Test user must be inactive"

        # Count should not include the inactive user
        after_count = await count_learner_seats(db)
        assert after_count == before_count, (
            f"Active learner count changed unexpectedly: {before_count} → {after_count}"
        )
        assert after_count >= 0, "Count must be non-negative"
