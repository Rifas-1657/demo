"""
app/personalization/bandit.py

Thompson-Sampling bandit for adaptive explanation-style selection.

Three arms per (user, topic):
  0 = analogy-first   (story / cricket / movie metaphor)
  1 = diagram-first   (visual graph before text)
  2 = code-first      (runnable example before explanation)

Reward signals (0.0 – 1.0):
  +1.0   practice question answered correctly first try
  +0.6   page completed without replaying
  +0.3   no follow-up question asked
  -0.4   replay requested (learner confused)
  -0.2   follow-up question asked
  -0.8   practice failed (wrong answer)

Posterior: Beta distribution per arm  α, β  (stored in DB).
Selection: sample θ_i ~ Beta(α_i, β_i), pick argmax.
Deterministic under fixed seed: pass rng_seed to sample().

Admin debug endpoint: GET /api/admin/bandit/{user_id}/{topic}
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Literal

ARM_LABELS: dict[int, str] = {
    0: "analogy-first",
    1: "diagram-first",
    2: "code-first",
}
NUM_ARMS = 3

RewardSignal = Literal[
    "practice_success",
    "practice_fail",
    "page_complete",
    "replay",
    "followup_question",
    "no_followup",
]

_REWARD_MAP: dict[RewardSignal, float] = {
    "practice_success": 1.0,
    "practice_fail":   -0.8,
    "page_complete":    0.6,
    "replay":          -0.4,
    "followup_question": -0.2,
    "no_followup":      0.3,
}


@dataclass
class BanditState:
    """Per-(user, topic) posterior parameters."""
    user_id: str
    topic: str
    # alpha[i], beta[i] for each arm (Beta distribution)
    alpha: list[float] = field(default_factory=lambda: [1.0, 1.0, 1.0])
    beta:  list[float] = field(default_factory=lambda: [1.0, 1.0, 1.0])

    def sample(self, rng_seed: int | None = None) -> int:
        """Return the arm index chosen by Thompson sampling."""
        rng = random.Random(rng_seed) if rng_seed is not None else random.Random()
        samples = [rng.betavariate(self.alpha[i], self.beta[i]) for i in range(NUM_ARMS)]
        return int(samples.index(max(samples)))

    def update(self, arm: int, reward: float) -> None:
        """
        Update Beta posterior given a reward in [-1, 1] scaled to [0, 1].
        Clip reward to [0,1] for Beta update: negative rewards increase beta.
        """
        r = max(0.0, min(1.0, (reward + 1.0) / 2.0))   # map [-1,1] → [0,1]
        self.alpha[arm] += r
        self.beta[arm]  += (1.0 - r)

    def arm_label(self, arm: int) -> str:
        return ARM_LABELS.get(arm, "analogy-first")

    def expected_rewards(self) -> list[float]:
        """Mean of Beta: α / (α + β) for each arm."""
        return [self.alpha[i] / (self.alpha[i] + self.beta[i]) for i in range(NUM_ARMS)]

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "topic": self.topic,
            "arms": [
                {
                    "arm": i,
                    "label": ARM_LABELS[i],
                    "alpha": round(self.alpha[i], 4),
                    "beta": round(self.beta[i], 4),
                    "expected_reward": round(self.expected_rewards()[i], 4),
                }
                for i in range(NUM_ARMS)
            ],
        }


def reward_value(signal: RewardSignal) -> float:
    return _REWARD_MAP.get(signal, 0.0)


# ---------------------------------------------------------------------------
# DB persistence helpers (async SQLAlchemy)
# ---------------------------------------------------------------------------

async def load_bandit_state(db, user_id: str, topic: str) -> BanditState:
    """Load or initialise a BanditState from DB."""
    from sqlalchemy import select
    from app.db.models import BanditArm

    rows = (await db.execute(
        select(BanditArm).where(
            BanditArm.user_id == user_id,
            BanditArm.topic == topic,
        )
    )).scalars().all()

    state = BanditState(user_id=user_id, topic=topic)
    for row in rows:
        if 0 <= row.arm < NUM_ARMS:
            state.alpha[row.arm] = row.alpha
            state.beta[row.arm]  = row.beta
    return state


async def save_bandit_state(db, state: BanditState) -> None:
    """Upsert all arms for (user, topic) to DB."""
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from app.db.models import BanditArm
    import app.db.database as _db_mod

    for arm in range(NUM_ARMS):
        existing = (await db.execute(
            __import__("sqlalchemy").select(BanditArm).where(
                BanditArm.user_id == state.user_id,
                BanditArm.topic   == state.topic,
                BanditArm.arm     == arm,
            )
        )).scalar_one_or_none()

        if existing:
            existing.alpha = state.alpha[arm]
            existing.beta  = state.beta[arm]
        else:
            db.add(BanditArm(
                user_id=state.user_id,
                topic=state.topic,
                arm=arm,
                alpha=state.alpha[arm],
                beta=state.beta[arm],
            ))
    await db.commit()


async def record_reward(
    db,
    user_id: str,
    topic: str,
    arm: int,
    signal: RewardSignal,
) -> BanditState:
    """Load state, apply reward, persist, return updated state."""
    state = await load_bandit_state(db, user_id, topic)
    state.update(arm, reward_value(signal))
    await save_bandit_state(db, state)
    return state
