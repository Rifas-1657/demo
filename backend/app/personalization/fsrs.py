"""
app/personalization/fsrs.py

FSRS-5 (Free Spaced Repetition Scheduler) for revision scheduling.

Implements the core FSRS-5 algorithm:
  - Stability S: how long until 90% retention
  - Difficulty D: card inherent difficulty [1,10]
  - Retrievability R(t) = 0.9^(t/S)  (t = days since last review)
  - next_interval = S * ln(target_retention) / ln(0.9)

Per-(user, topic) mastery scores derived from:
  - FSRS retrievability (recent)
  - Practice success rate (all time)
  - Time spent on page

Exposed endpoints:
  GET /api/me/mastery              → all topics with scores
  GET /api/me/revision-queue       → topics due today (R < 0.9)
  POST /api/me/review/{topic}      → submit review result
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

# FSRS-5 constants
FSRS_W = [
    0.4072, 1.1829, 3.1262, 15.4722,
    7.2102, 0.5316, 1.0651, 0.0589,
    1.506,  0.1544, 1.0071, 1.9297,
    0.1514, 0.1104, 0.2099, 0.2900,
    2.2700,
]
TARGET_RETENTION = 0.9

Rating = Literal["again", "hard", "good", "easy"]
_RATING_TO_INT: dict[Rating, int] = {"again": 1, "hard": 2, "good": 3, "easy": 4}


@dataclass
class FSRSCard:
    """State for one (user, topic) card."""
    user_id: str
    topic: str
    stability: float = 1.0        # S
    difficulty: float = 5.0       # D  [1..10]
    last_review_date: date | None = None
    review_count: int = 0
    lapses: int = 0

    @property
    def retrievability(self) -> float:
        """R(t) = 0.9^(t/S)"""
        if self.last_review_date is None:
            return 0.0
        t = (date.today() - self.last_review_date).days
        return math.pow(TARGET_RETENTION, t / max(self.stability, 0.001))

    @property
    def is_due(self) -> bool:
        return self.retrievability < TARGET_RETENTION

    def next_interval_days(self) -> int:
        if self.stability <= 0:
            return 1
        days = self.stability * math.log(TARGET_RETENTION) / math.log(0.9)
        return max(1, int(round(days)))

    def next_due_date(self) -> date:
        return date.today() + timedelta(days=self.next_interval_days())

    def review(self, rating: Rating) -> "FSRSCard":
        """Apply one review and return updated card (immutable update pattern)."""
        r = _RATING_TO_INT[rating]
        new_difficulty = _update_difficulty(self.difficulty, r)
        retrievability = self.retrievability

        if self.review_count == 0:
            new_stability = _initial_stability(r)
        elif rating == "again":
            new_stability = _recall_stability_after_lapse(
                self.difficulty, self.stability, retrievability
            )
        else:
            new_stability = _recall_stability(
                self.difficulty, self.stability, retrievability, r
            )

        return FSRSCard(
            user_id=self.user_id,
            topic=self.topic,
            stability=max(0.1, new_stability),
            difficulty=max(1.0, min(10.0, new_difficulty)),
            last_review_date=date.today(),
            review_count=self.review_count + 1,
            lapses=self.lapses + (1 if rating == "again" else 0),
        )

    def mastery_score(self, practice_success_rate: float = 1.0) -> float:
        """
        0–100 mastery score combining:
          60% FSRS retrievability
          40% practice success rate
        """
        r = self.retrievability
        return round(0.6 * r * 100 + 0.4 * practice_success_rate * 100, 1)

    def to_dict(self) -> dict:
        return {
            "topic": self.topic,
            "stability": round(self.stability, 3),
            "difficulty": round(self.difficulty, 2),
            "retrievability": round(self.retrievability, 4),
            "mastery_score": self.mastery_score(),
            "is_due": self.is_due,
            "next_due": self.next_due_date().isoformat() if not self.is_due else date.today().isoformat(),
            "review_count": self.review_count,
            "lapses": self.lapses,
        }


# ---------------------------------------------------------------------------
# FSRS-5 internal functions
# ---------------------------------------------------------------------------

def _initial_stability(rating: int) -> float:
    return FSRS_W[rating - 1]


def _update_difficulty(d: float, rating: int) -> float:
    return d - FSRS_W[4] * (rating - 3) + FSRS_W[5] * (10 - d) * (rating - 1) / 9


def _recall_stability(d: float, s: float, r: float, rating: int) -> float:
    return s * (
        math.exp(FSRS_W[8])
        * (11 - d)
        * math.pow(s, -FSRS_W[9])
        * (math.exp((1 - r) * FSRS_W[10]) - 1)
        * (FSRS_W[15] if rating == 2 else 1)
        * (FSRS_W[16] if rating == 4 else 1)
    )


def _recall_stability_after_lapse(d: float, s: float, r: float) -> float:
    return (
        FSRS_W[11]
        * math.pow(d, -FSRS_W[12])
        * (math.pow(s + 1, FSRS_W[13]) - 1)
        * math.exp((1 - r) * FSRS_W[14])
    )


# ---------------------------------------------------------------------------
# DB persistence
# ---------------------------------------------------------------------------

async def load_card(db, user_id: str, topic: str) -> FSRSCard:
    from sqlalchemy import select
    from app.db.models import FSRSCardModel

    row = (await db.execute(
        select(FSRSCardModel).where(
            FSRSCardModel.user_id == user_id,
            FSRSCardModel.topic == topic,
        )
    )).scalar_one_or_none()

    if row is None:
        return FSRSCard(user_id=user_id, topic=topic)

    # DB stores DateTime (datetime); FSRSCard uses date. Convert safely.
    lrd = row.last_review_date
    if lrd is not None and hasattr(lrd, "date"):
        lrd = lrd.date()  # datetime -> date

    return FSRSCard(
        user_id=user_id,
        topic=topic,
        stability=row.stability,
        difficulty=row.difficulty,
        last_review_date=lrd,
        review_count=row.review_count,
        lapses=row.lapses,
    )


async def save_card(db, card: FSRSCard) -> None:
    from sqlalchemy import select
    from app.db.models import FSRSCardModel

    row = (await db.execute(
        select(FSRSCardModel).where(
            FSRSCardModel.user_id == card.user_id,
            FSRSCardModel.topic == card.topic,
        )
    )).scalar_one_or_none()

    if row is None:
        db.add(FSRSCardModel(
            user_id=card.user_id,
            topic=card.topic,
            stability=card.stability,
            difficulty=card.difficulty,
            # Convert date -> datetime for SQLAlchemy DateTime column
            last_review_date=__import__('datetime').datetime.combine(
                card.last_review_date, __import__('datetime').time.min
            ) if card.last_review_date else None,
            review_count=card.review_count,
            lapses=card.lapses,
        ))
    else:
        row.stability = card.stability
        row.difficulty = card.difficulty
        row.last_review_date = card.last_review_date
        row.review_count = card.review_count
        row.lapses = card.lapses

    await db.commit()


async def submit_review(db, user_id: str, topic: str, rating: Rating) -> FSRSCard:
    card = await load_card(db, user_id, topic)
    updated = card.review(rating)
    await save_card(db, updated)
    return updated


async def get_revision_queue(db, user_id: str) -> list[FSRSCard]:
    """Return all cards due for review today."""
    from sqlalchemy import select
    from app.db.models import FSRSCardModel
    from datetime import date

    rows = (await db.execute(
        select(FSRSCardModel).where(FSRSCardModel.user_id == user_id)
    )).scalars().all()

    def _to_date(v):
        if v is not None and hasattr(v, "date"):
            return v.date()
        return v

    cards = [
        FSRSCard(
            user_id=user_id,
            topic=row.topic,
            stability=row.stability,
            difficulty=row.difficulty,
            last_review_date=_to_date(row.last_review_date),
            review_count=row.review_count,
            lapses=row.lapses,
        )
        for row in rows
    ]
    return [c for c in cards if c.is_due]
