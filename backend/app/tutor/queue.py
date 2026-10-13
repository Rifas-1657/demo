"""
app/tutor/queue.py

Question queue for "question asked during narration" flow.

Design:
- Learner asks a question while narration is playing → question is queued
- At the end of the current narration sentence, the server drains the queue
- Near-identical questions are deduped (Jaccard similarity > 0.8)
- Queue is per-session (keyed by session_id)
- Oldest first, max 20 queued per session
"""
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Iterator

_MAX_QUEUE_SIZE = 20
_DEDUP_THRESHOLD = 0.8


@dataclass
class QueuedQuestion:
    question_id: str
    user_id: str
    question: str
    source: str = "text"  # "text" | "voice"
    queued_at: float = field(default_factory=time.monotonic)


class QuestionQueue:
    """Per-session FIFO queue with near-duplicate detection."""

    def __init__(self) -> None:
        self._items: list[QueuedQuestion] = []

    def enqueue(self, item: QueuedQuestion) -> bool:
        """
        Add to queue. Returns False if the question is a near-duplicate of
        an already-queued item (Jaccard > threshold) or queue is full.
        """
        if len(self._items) >= _MAX_QUEUE_SIZE:
            return False
        for existing in self._items:
            if _jaccard(existing.question, item.question) >= _DEDUP_THRESHOLD:
                return False  # deduped
        self._items.append(item)
        return True

    def drain(self) -> list[QueuedQuestion]:
        """Return all queued questions in FIFO order and clear the queue."""
        items = list(self._items)
        self._items.clear()
        return items

    def peek(self) -> list[QueuedQuestion]:
        return list(self._items)

    def __len__(self) -> int:
        return len(self._items)


# Global registry of per-session queues
_session_queues: dict[str, QuestionQueue] = defaultdict(QuestionQueue)


def get_queue(session_id: str) -> QuestionQueue:
    return _session_queues[session_id]


def clear_queue(session_id: str) -> None:
    _session_queues.pop(session_id, None)


def _jaccard(a: str, b: str) -> float:
    """Token-level Jaccard similarity."""
    sa = set(a.lower().split())
    sb = set(b.lower().split())
    if not sa and not sb:
        return 1.0
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)
