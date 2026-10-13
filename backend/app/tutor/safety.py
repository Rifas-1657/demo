"""
app/tutor/safety.py

Safety enforcement layer:
- System prompt never revealed (enforced by scope_guard injection detection)
- Prompt injection in question text → refused (INJECTION_REFUSAL message)
- No code execution on server (code blocks in answer are display-only)
- Output length cap (MAX_ANSWER_TOKENS)
- Per-user rate limit (N questions per minute via in-memory sliding window)
- Daily token budget per user with friendly exhaustion message

Rate limiting uses a simple in-memory sliding window (resets on server restart).
For production, use Redis. Fine for current scale (4 learner seats).
"""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from datetime import date

_user_windows: dict[str, deque] = defaultdict(lambda: deque())  # user_id → timestamps
_user_daily_tokens: dict[str, tuple[str, int]] = {}  # user_id → (date, tokens_used)

MAX_QUESTIONS_PER_MINUTE = 10
DAILY_TOKEN_BUDGET = 50_000
MAX_ANSWER_TOKENS = 800
MAX_QUESTION_CHARS = 1000


class RateLimitError(Exception):
    def __init__(self, msg: str, is_budget: bool = False) -> None:
        super().__init__(msg)
        self.is_budget = is_budget


def check_question_length(question: str) -> None:
    if len(question) > MAX_QUESTION_CHARS:
        raise RateLimitError(
            f"Question is too long ({len(question)} chars). Please keep it under {MAX_QUESTION_CHARS} characters."
        )


def check_rate_limit(user_id: str) -> None:
    """Raise RateLimitError if user exceeds per-minute question limit."""
    now = time.monotonic()
    window = _user_windows[user_id]
    cutoff = now - 60.0
    while window and window[0] < cutoff:
        window.popleft()
    if len(window) >= MAX_QUESTIONS_PER_MINUTE:
        raise RateLimitError(
            f"Neenga romba velaga questions kekkuriinga! "
            f"Oru nimisham wait pannunga. "
            f"(Rate limit: {MAX_QUESTIONS_PER_MINUTE} questions/minute)"
        )
    window.append(now)


def record_tokens(user_id: str, tokens: int) -> None:
    today = date.today().isoformat()
    existing = _user_daily_tokens.get(user_id)
    if existing and existing[0] == today:
        used = existing[1] + tokens
    else:
        used = tokens
    _user_daily_tokens[user_id] = (today, used)


def check_daily_budget(user_id: str) -> None:
    today = date.today().isoformat()
    existing = _user_daily_tokens.get(user_id)
    if existing and existing[0] == today and existing[1] >= DAILY_TOKEN_BUDGET:
        raise RateLimitError(
            "Innaiku token budget exhaust aayiduchu! "
            f"Daily limit: {DAILY_TOKEN_BUDGET:,} tokens. "
            "Naalaiku reset aagum. Udane contact pannunga.",
            is_budget=True,
        )


TANGLISH_BUDGET_MESSAGE = (
    "Innaiku token budget exhaust aayiduchu! "
    "Naalaiku reset aagum. Admin-kku contact pannunga."
)

TANGLISH_RATE_MESSAGE = (
    "Oru nimisham wait pannunga — romba velaga questions! "
    "Ennoda answer-ah padichitu kellu."
)
