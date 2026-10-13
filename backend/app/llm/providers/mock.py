"""
app/llm/providers/mock.py

Deterministic mock LLM provider for tests.
Returns a pre-programmed GeneratedPage JSON.
Can be configured to fail on demand (simulate quota / timeout).
"""
from __future__ import annotations

import asyncio
import json

from app.llm import LLMProvider, LLMResponse

# Narration with 80+ words so verifier word-count check passes (min=60)
_NARRATION = (
    "Python-la variable-u nu solluvadhu oru named storage location. "
    "Oru variable create pannuvadhu romba simple — just oru name kuduthu equal sign pottu value assign pannunga. "
    "Example: x = 42 nu write pannina, x nu oru variable create aagum, adhu 42 nu oru integer value-ah hold pannum. "
    "Intha concept cricket-la score board maari — board-la player peyar irukku, aaana score maari maari change aagum. "
    "Python dynamically typed language, so neenga type explicitly declare panna vendiyathillai. "
    "Variables are essential building blocks in every Python program you will ever write."
)

# Default valid page JSON — all cue targetIds reference actual segment/node IDs
_DEFAULT_PAGE = {
    "course_id": "python",
    "chapter": 2,
    "page": 1,
    "content_version": "mock-v1",
    "personalization_hash": "",
    "title": "Variables and Types",
    "narration": _NARRATION,
    "word_count": 0,  # computed by GeneratedPage schema validator
    "segments": [
        {
            "id": "seg-1",
            "type": "explanation",
            "text": "Variable declaration example",
            "cues": [{"atWord": "variable", "action": "highlight", "targetId": "n1"}],
        },
        {
            "id": "seg-2",
            "type": "code",
            "code": "x = 42\nname = 'Alice'\nprint(x, name)",
            "language": "python",
            "expected_output": "42 Alice",
            # targetId references seg-2 itself (valid — segment id exists)
            "cues": [{"atWord": "x", "action": "highlight", "targetId": "seg-2"}],
        },
    ],
    "diagram": {
        "nodes": [
            {"id": "n1", "label": "Variable x", "x": 100, "y": 100, "w": 120, "h": 40},
            {"id": "n2", "label": "Value 42",   "x": 300, "y": 100, "w": 120, "h": 40},
        ],
        "edges": [{"from": "n1", "to": "n2", "label": "stores"}],
        "steps": [
            {"step": 1, "nodeId": "n1", "description": "Declare variable"},
            {"step": 2, "nodeId": "n2", "description": "Assign value"},
        ],
    },
    "practice_prompts": [
        {"id": "p1", "prompt": "Create a variable 'score' with value 100", "difficulty": "easy"},
    ],
    "analogies": {
        "movie": "Variable-u film-la actor maari — peyar irukku aaana kalakuravanga vera vera aagalam.",
        "cricket": "Variable-u cricket-la oru fielder maari — same position, different player.",
    },
    "citations": [],
}


class MockLLMProvider(LLMProvider):
    name = "mock"

    def __init__(
        self,
        page_json: dict | None = None,
        fail_count: int = 0,
        fail_error: str = "Mock simulated 429: quota exceeded",
        latency_ms: float = 5.0,
    ) -> None:
        self._page_json = page_json or _DEFAULT_PAGE
        self._fail_remaining = fail_count
        self._fail_error = fail_error
        self._latency_ms = latency_ms
        self._call_count = 0

    def set_fail_count(self, n: int, error: str | None = None) -> None:
        self._fail_remaining = n
        if error:
            self._fail_error = error

    def set_page_json(self, data: dict) -> None:
        self._page_json = data

    @property
    def call_count(self) -> int:
        return self._call_count

    async def is_available(self) -> bool:
        return True

    async def generate_text(self, prompt: str, system: str = "", temperature: float = 0.7, max_tokens: int = 4096, timeout: float = 30.0) -> LLMResponse:
        return await self._call(prompt)

    async def generate_json(self, prompt: str, schema: dict, system: str = "", temperature: float = 0.2, max_tokens: int = 8192, timeout: float = 60.0) -> LLMResponse:
        return await self._call(prompt)

    async def _call(self, prompt: str) -> LLMResponse:
        self._call_count += 1
        if self._latency_ms > 0:
            await asyncio.sleep(self._latency_ms / 1000)
        if self._fail_remaining > 0:
            self._fail_remaining -= 1
            from app.llm.router import LLMError
            raise LLMError(f"{self._fail_error} (call #{self._call_count})", provider=self.name, retryable=True)
        text = json.dumps(self._page_json)
        return LLMResponse(
            text=text,
            provider=self.name,
            model="mock-model",
            tokens_in=len(prompt) // 4,
            tokens_out=len(text) // 4,
            latency_ms=self._latency_ms,
        )
