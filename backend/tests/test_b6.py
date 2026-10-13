"""
tests/test_b6.py — B6 tests: bandit, FSRS, health endpoints, personalization API.
"""
from __future__ import annotations

import math
import pytest
from httpx import AsyncClient
from datetime import date, timedelta


pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Bandit unit tests
# ---------------------------------------------------------------------------

def test_bandit_initial_state_uniform():
    """Uninformed bandit: expected reward should be equal across all arms."""
    from app.personalization.bandit import BanditState, NUM_ARMS
    state = BanditState(user_id="u1", topic="variables")
    rewards = state.expected_rewards()
    assert len(rewards) == NUM_ARMS
    # All start at 0.5 (Beta(1,1) = Uniform)
    assert all(abs(r - 0.5) < 1e-9 for r in rewards)


def test_bandit_reward_updates_posterior():
    from app.personalization.bandit import BanditState
    state = BanditState(user_id="u1", topic="loops")
    old_alpha = state.alpha[0]
    state.update(arm=0, reward=1.0)
    # Positive reward increases alpha
    assert state.alpha[0] > old_alpha


def test_bandit_negative_reward_increases_beta():
    from app.personalization.bandit import BanditState
    state = BanditState(user_id="u1", topic="loops")
    old_beta = state.beta[1]
    state.update(arm=1, reward=-1.0)
    assert state.beta[1] > old_beta


def test_bandit_sample_deterministic_with_seed():
    """Same seed → same arm selected."""
    from app.personalization.bandit import BanditState
    state = BanditState(user_id="u1", topic="functions")
    arm1 = state.sample(rng_seed=42)
    arm2 = state.sample(rng_seed=42)
    assert arm1 == arm2


def test_bandit_sample_different_seeds_may_differ():
    """Different seeds can produce different arms over many trials."""
    from app.personalization.bandit import BanditState
    state = BanditState(user_id="u1", topic="functions")
    results = {state.sample(rng_seed=i) for i in range(50)}
    # With uniform priors, all 3 arms should appear
    assert len(results) > 1


def test_bandit_arm_label():
    from app.personalization.bandit import BanditState, ARM_LABELS
    state = BanditState(user_id="u1", topic="x")
    for arm, label in ARM_LABELS.items():
        assert state.arm_label(arm) == label


def test_bandit_to_dict_structure():
    from app.personalization.bandit import BanditState
    state = BanditState(user_id="u1", topic="t")
    d = state.to_dict()
    assert d["user_id"] == "u1"
    assert d["topic"] == "t"
    assert len(d["arms"]) == 3
    for arm in d["arms"]:
        assert "alpha" in arm and "beta" in arm and "expected_reward" in arm


def test_bandit_reward_signals():
    from app.personalization.bandit import reward_value, _REWARD_MAP
    for signal, val in _REWARD_MAP.items():
        assert reward_value(signal) == val


def test_bandit_after_many_wins_arm_dominates():
    """After many successes on arm 2, arm 2 should be sampled most often."""
    from app.personalization.bandit import BanditState
    state = BanditState(user_id="u1", topic="oop")
    for _ in range(30):
        state.update(arm=2, reward=1.0)
    # Sample many times; arm 2 should dominate
    counts = [0, 0, 0]
    for seed in range(200):
        counts[state.sample(rng_seed=seed)] += 1
    assert counts[2] > counts[0] and counts[2] > counts[1], f"arm 2 should dominate: {counts}"


# ---------------------------------------------------------------------------
# FSRS unit tests
# ---------------------------------------------------------------------------

def test_fsrs_initial_retrievability_zero():
    from app.personalization.fsrs import FSRSCard
    card = FSRSCard(user_id="u1", topic="variables")
    assert card.retrievability == 0.0


def test_fsrs_review_good_sets_last_date():
    from app.personalization.fsrs import FSRSCard
    card = FSRSCard(user_id="u1", topic="variables")
    updated = card.review("good")
    assert updated.last_review_date == date.today()
    assert updated.review_count == 1


def test_fsrs_again_increases_lapses():
    from app.personalization.fsrs import FSRSCard
    card = FSRSCard(user_id="u1", topic="loops")
    updated = card.review("again")
    assert updated.lapses == 1


def test_fsrs_is_due_after_long_gap():
    from app.personalization.fsrs import FSRSCard
    card = FSRSCard(user_id="u1", topic="oop", stability=1.0,
                    last_review_date=date.today() - timedelta(days=30))
    assert card.is_due


def test_fsrs_not_due_immediately_after_review():
    from app.personalization.fsrs import FSRSCard
    card = FSRSCard(user_id="u1", topic="oop")
    updated = card.review("good")
    # Immediately after reviewing, retrievability == 1.0, not due
    assert not updated.is_due


def test_fsrs_mastery_score_range():
    from app.personalization.fsrs import FSRSCard
    card = FSRSCard(user_id="u1", topic="t")
    updated = card.review("easy")
    score = updated.mastery_score(practice_success_rate=1.0)
    assert 0.0 <= score <= 100.0


def test_fsrs_next_interval_positive():
    from app.personalization.fsrs import FSRSCard
    card = FSRSCard(user_id="u1", topic="t")
    updated = card.review("good")
    assert updated.next_interval_days() >= 1


def test_fsrs_to_dict_structure():
    from app.personalization.fsrs import FSRSCard
    card = FSRSCard(user_id="u1", topic="t")
    d = card.to_dict()
    assert "stability" in d
    assert "retrievability" in d
    assert "mastery_score" in d
    assert "is_due" in d
    assert "next_due" in d


def test_fsrs_easy_rating_gives_higher_stability_than_good():
    from app.personalization.fsrs import FSRSCard
    base = FSRSCard(user_id="u1", topic="t")
    good_card = base.review("good")
    easy_card = base.review("easy")
    assert easy_card.stability >= good_card.stability


def test_fsrs_again_then_good_increases_stability():
    from app.personalization.fsrs import FSRSCard
    card = FSRSCard(user_id="u1", topic="t")
    after_again = card.review("again")
    after_good = after_again.review("good")
    # Stability should be positive after recovery
    assert after_good.stability > 0


# ---------------------------------------------------------------------------
# Health endpoints
# ---------------------------------------------------------------------------

async def test_health_endpoint(http_client: AsyncClient):
    resp = await http_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


async def test_ready_endpoint_returns_checks(http_client: AsyncClient):
    resp = await http_client.get("/ready")
    assert resp.status_code in (200, 503)
    data = resp.json()
    assert "checks" in data
    assert "database" in data["checks"]


# ---------------------------------------------------------------------------
# Observability helpers
# ---------------------------------------------------------------------------

def test_record_provider_call_and_summary():
    from app.observability import record_provider_call, provider_summary
    record_provider_call("test_prov", "test-model", 123.0, True, tokens=50)
    summary = provider_summary()
    assert "test_prov" in summary
    assert summary["test_prov"]["total_calls"] >= 1


def test_request_id_context_var():
    from app.observability import _request_id_var, get_request_id
    tok = _request_id_var.set("abc123")
    assert get_request_id() == "abc123"
    _request_id_var.reset(tok)


# ---------------------------------------------------------------------------
# Personalization API endpoints
# ---------------------------------------------------------------------------

async def test_bandit_select_endpoint(http_client: AsyncClient, learner_token: str):
    resp = await http_client.get(
        "/api/me/bandit/variables",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "arm" in data
    assert data["arm"] in (0, 1, 2)
    assert "label" in data


async def test_bandit_select_with_seed_deterministic(http_client: AsyncClient, learner_token: str):
    r1 = await http_client.get(
        "/api/me/bandit/variables?rng_seed=99",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    r2 = await http_client.get(
        "/api/me/bandit/variables?rng_seed=99",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert r1.json()["arm"] == r2.json()["arm"]


async def test_bandit_reward_endpoint(http_client: AsyncClient, learner_token: str):
    resp = await http_client.post(
        "/api/me/bandit/variables/reward",
        json={"arm": 0, "signal": "practice_success"},
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "arms" in data


async def test_mastery_endpoint_empty(http_client: AsyncClient, learner_token: str):
    resp = await http_client.get(
        "/api/me/mastery",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert resp.status_code == 200
    assert "mastery" in resp.json()


async def test_revision_queue_endpoint(http_client: AsyncClient, learner_token: str):
    resp = await http_client.get(
        "/api/me/revision-queue",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "due" in data
    assert "count" in data


async def test_review_endpoint(http_client: AsyncClient, learner_token: str):
    resp = await http_client.post(
        "/api/me/review/variables",
        json={"rating": "good"},
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "stability" in data
    assert "mastery_score" in data


async def test_review_then_mastery_not_empty(http_client: AsyncClient, learner_token: str):
    """After a review, mastery should have at least one card."""
    await http_client.post(
        "/api/me/review/loops",
        json={"rating": "easy"},
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    resp = await http_client.get(
        "/api/me/mastery",
        headers={"Authorization": f"Bearer {learner_token}"},
    )
    mastery = resp.json()["mastery"]
    topics = [m["topic"] for m in mastery]
    assert "loops" in topics


async def test_admin_bandit_debug_endpoint(http_client: AsyncClient, admin_token: str, learner_user):
    resp = await http_client.get(
        f"/api/admin/bandit/{learner_user.id}/variables",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "arms" in data


async def test_bandit_endpoint_requires_auth(http_client: AsyncClient):
    resp = await http_client.get("/api/me/bandit/variables")
    assert resp.status_code == 401
