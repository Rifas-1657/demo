"""
tests/test_page_gen.py — B3 page generator tests.

All tests use MockLLMProvider — zero latency, no API keys.

Tests:
1.  Schema validation: valid GeneratedPage passes
2.  Schema rejects dangling cue target
3.  Schema rejects dangling diagram edge
4.  Schema rejects duplicate segment IDs
5.  Schema rejects out-of-bounds diagram node
6.  Repair loop: 1 failure then success → generates on attempt 2
7.  Repair loop: 3 failures → raises GenerationError
8.  Cache hit: second call returns cached, LLM not called again
9.  Cache miss + regenerate flag: LLM called even if cache present
10. Fallback chain: first provider fails, second succeeds
11. Unsupported course → GenerationError with clear message
12. Code sandbox: correct output → code_verified=True
13. Code sandbox: wrong output → verification error → repair triggered
14. Narration too short → verification error
15. Cue-target integrity in verifier
16. API endpoint: POST /api/admin/pages/generate returns 200 with valid schema
17. API endpoint: non-Python course → 400
18. API endpoint: admin required (learner gets 403)
19. LLM usage recorded in DB after generation
20. Scoped: GeneratedPage model_dump round-trips correctly
"""
from __future__ import annotations

import asyncio
import copy
import json
import uuid
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

from app.llm.providers.mock import MockLLMProvider
from app.llm.router import LLMError, LLMRouter
from app.page_gen.pipeline import GenerationError, generate_page, _strip_fences
from app.page_gen.sandbox import run_code
from app.page_gen.schema import (
    Cue, Diagram, DiagramEdge, DiagramNode, DiagramStep,
    GeneratedPage, Segment, PracticePrompt, Analogies,
)
from app.page_gen.verifier import verify_page

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Sample data helpers
# ---------------------------------------------------------------------------

def _valid_page_dict(**overrides) -> dict:
    base = {
        "course_id": "python",
        "chapter": 2,
        "page": 1,
        "content_version": "v1",
        "personalization_hash": "",
        "title": "Variables and Types",
        "narration": " ".join(["Variable-u nu solluvadhukku Python-la oru name-ku value assign pannuvom."] * 4),
        "word_count": 0,
        "segments": [
            {
                "id": "seg-1",
                "type": "explanation",
                "text": "Variable declaration",
                "cues": [{"atWord": "Variable", "action": "highlight", "targetId": "seg-1"}],
            },
            {
                "id": "seg-2",
                "type": "code",
                "code": "x = 42\nprint(x)",
                "language": "python",
                "expected_output": "42",
                "cues": [],
            },
        ],
        "diagram": {
            "nodes": [
                {"id": "n1", "label": "Variable x", "x": 100, "y": 100, "w": 120, "h": 40},
                {"id": "n2", "label": "Value 42", "x": 300, "y": 100, "w": 120, "h": 40},
            ],
            "edges": [{"from": "n1", "to": "n2", "label": "stores"}],
            "steps": [{"step": 1, "nodeId": "n1", "description": "Start"}],
        },
        "practice_prompts": [{"id": "p1", "prompt": "Make a variable called score = 100", "difficulty": "easy"}],
        "analogies": {"movie": "Variable-u film-la actor maari.", "cricket": "Variable-u fielder maari."},
        "citations": [],
    }
    base.update(overrides)
    return base


def _make_router(provider: MockLLMProvider) -> LLMRouter:
    return LLMRouter(providers=[provider], retry_per_provider=0, backoff_base_s=0)


# ---------------------------------------------------------------------------
# 1. Schema: valid page passes
# ---------------------------------------------------------------------------

def test_schema_valid_page():
    page = GeneratedPage.model_validate(_valid_page_dict())
    assert page.course_id == "python"
    assert page.word_count > 0
    assert len(page.segments) == 2


# ---------------------------------------------------------------------------
# 2. Schema: dangling cue target rejected
# ---------------------------------------------------------------------------

def test_schema_dangling_cue_target():
    data = _valid_page_dict()
    data["segments"][0]["cues"] = [{"atWord": "test", "action": "highlight", "targetId": "nonexistent-id"}]
    import pydantic
    with pytest.raises(pydantic.ValidationError, match="not found"):
        GeneratedPage.model_validate(data)


# ---------------------------------------------------------------------------
# 3. Schema: dangling diagram edge rejected
# ---------------------------------------------------------------------------

def test_schema_dangling_diagram_edge():
    data = _valid_page_dict()
    data["diagram"]["edges"].append({"from": "n1", "to": "MISSING_NODE"})
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        GeneratedPage.model_validate(data)


# ---------------------------------------------------------------------------
# 4. Schema: duplicate segment IDs rejected
# ---------------------------------------------------------------------------

def test_schema_duplicate_segment_ids():
    data = _valid_page_dict()
    data["segments"][1]["id"] = "seg-1"  # duplicate
    import pydantic
    with pytest.raises(pydantic.ValidationError, match="unique"):
        GeneratedPage.model_validate(data)


# ---------------------------------------------------------------------------
# 5. Schema: out-of-bounds diagram node rejected
# ---------------------------------------------------------------------------

def test_schema_out_of_bounds_node():
    data = _valid_page_dict()
    data["diagram"]["nodes"][0]["x"] = 900  # > 800
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        GeneratedPage.model_validate(data)


# ---------------------------------------------------------------------------
# 6. Repair loop: 1 failure then success
# ---------------------------------------------------------------------------

async def test_repair_loop_one_failure_then_success():
    """Provider fails once (bad JSON), then returns valid page on repair attempt."""
    provider = MockLLMProvider()

    call_count = 0
    original_call = provider._call

    async def _patched_call(prompt: str):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # Return invalid JSON first
            from app.llm import LLMResponse
            return LLMResponse(text="NOT JSON {{{", provider="mock", model="mock-model")
        return await original_call(prompt)

    provider._call = _patched_call
    router = _make_router(provider)

    page = await generate_page(
        course_id="python", chapter=2, page=99,
        chapter_topic="Variables", page_topic="Intro",
        regenerate=True, llm_router=router,
    )
    assert page.course_id == "python"
    assert call_count == 2  # first fail + one repair


# ---------------------------------------------------------------------------
# 7. Repair loop: all attempts fail → GenerationError
# ---------------------------------------------------------------------------

async def test_repair_loop_all_fail():
    provider = MockLLMProvider()

    async def _bad_call(prompt: str):
        from app.llm import LLMResponse
        return LLMResponse(text='{"invalid": true}', provider="mock", model="mock-model")

    provider._call = _bad_call
    router = _make_router(provider)

    with pytest.raises(GenerationError):
        await generate_page(
            course_id="python", chapter=2, page=98,
            regenerate=True, llm_router=router,
        )


# ---------------------------------------------------------------------------
# 8. Cache hit: LLM not called on second request
# ---------------------------------------------------------------------------

async def test_cache_hit():
    provider = MockLLMProvider()
    router = _make_router(provider)
    calls_before = provider.call_count

    # First call — generates and caches
    page1 = await generate_page(
        course_id="python", chapter=2, page=1,
        llm_router=router,
    )
    calls_after_first = provider.call_count

    # Second call — should hit cache, no LLM call
    page2 = await generate_page(
        course_id="python", chapter=2, page=1,
        llm_router=router,
    )
    assert provider.call_count == calls_after_first, "LLM called on cache hit!"
    assert page1.title == page2.title


# ---------------------------------------------------------------------------
# 9. Regenerate flag bypasses cache
# ---------------------------------------------------------------------------

async def test_regenerate_flag_bypasses_cache():
    provider = MockLLMProvider()
    router = _make_router(provider)

    await generate_page(course_id="python", chapter=2, page=1, llm_router=router)
    calls_after_first = provider.call_count

    await generate_page(course_id="python", chapter=2, page=1, regenerate=True, llm_router=router)
    assert provider.call_count > calls_after_first, "Cache not bypassed by regenerate=True"


# ---------------------------------------------------------------------------
# 10. Fallback chain: first provider fails, second succeeds
# ---------------------------------------------------------------------------

async def test_fallback_chain():
    failing = MockLLMProvider(fail_count=999)  # always fails
    working = MockLLMProvider()
    router = LLMRouter(providers=[failing, working], retry_per_provider=0, backoff_base_s=0)

    page = await generate_page(
        course_id="python", chapter=2, page=77,
        regenerate=True, llm_router=router,
    )
    assert page.course_id == "python"
    assert working.call_count >= 1


# ---------------------------------------------------------------------------
# 11. Unsupported course → GenerationError
# ---------------------------------------------------------------------------

async def test_unsupported_course():
    router = _make_router(MockLLMProvider())
    with pytest.raises(GenerationError, match="not supported"):
        await generate_page(
            course_id="javascript", chapter=1, page=1,
            llm_router=router, regenerate=True,
        )


# ---------------------------------------------------------------------------
# 12. Code sandbox: correct output → code_verified=True
# ---------------------------------------------------------------------------

async def test_sandbox_correct_output():
    actual, err = await run_code("print(2 + 2)", "4")
    assert err is None
    assert actual == "4"


# ---------------------------------------------------------------------------
# 13. Code sandbox: wrong output → error returned
# ---------------------------------------------------------------------------

async def test_sandbox_wrong_output():
    actual, err = await run_code("print('hello')", "goodbye")
    assert err is not None
    assert "mismatch" in err.lower()


# ---------------------------------------------------------------------------
# 14. Narration too short → verification error
# ---------------------------------------------------------------------------

async def test_narration_too_short():
    data = _valid_page_dict()
    data["narration"] = "Short."
    data["word_count"] = 1
    page = GeneratedPage.model_validate(data)
    vr = await verify_page(page)
    assert not vr.is_valid
    assert any("word count" in e.lower() for e in vr.errors)


# ---------------------------------------------------------------------------
# 15. Cue-target integrity in verifier
# ---------------------------------------------------------------------------

async def test_verifier_cue_target_ok():
    page = GeneratedPage.model_validate(_valid_page_dict())
    # Override narration to be long enough
    page.narration = " ".join(["word"] * 80)
    page.word_count = 80
    vr = await verify_page(page)
    # Should have no cue-target errors (sandbox may verify code)
    cue_errs = [e for e in vr.errors if "cue" in e.lower()]
    assert cue_errs == []


# ---------------------------------------------------------------------------
# 16. API: POST /api/admin/pages/generate returns 200
# ---------------------------------------------------------------------------

async def test_api_generate_page(admin_http_client):
    with patch("app.api.admin.pages.generate_page") as mock_gen:
        page = GeneratedPage.model_validate(_valid_page_dict())
        mock_gen.return_value = page
        resp = await admin_http_client.post(
            "/api/admin/pages/generate",
            json={
                "course_id": "python",
                "chapter": 2,
                "page": 1,
                "chapter_topic": "Variables",
                "page_topic": "What is a variable?",
            },
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["course_id"] == "python"
    assert "segments" in data
    assert "diagram" in data


# ---------------------------------------------------------------------------
# 17. API: non-Python course → 400
# ---------------------------------------------------------------------------

async def test_api_unsupported_course(admin_http_client):
    with patch("app.api.admin.pages.generate_page", side_effect=GenerationError("not supported")):
        resp = await admin_http_client.post(
            "/api/admin/pages/generate",
            json={"course_id": "javascript", "chapter": 1, "page": 1},
        )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 18. API: learner → 403
# ---------------------------------------------------------------------------

async def test_api_learner_forbidden(auth_http_client):
    resp = await auth_http_client.post(
        "/api/admin/pages/generate",
        json={"course_id": "python", "chapter": 1, "page": 1},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# 19. LLM usage recorded in DB
# ---------------------------------------------------------------------------

async def test_llm_usage_recorded():
    from app.db.database import AsyncSessionLocal
    from app.db.models import LLMUsage
    from sqlalchemy import select

    provider = MockLLMProvider()
    router = _make_router(provider)

    # Generate a unique page to ensure a DB write
    await generate_page(
        course_id="python", chapter=99, page=99,
        regenerate=True, llm_router=router,
    )
    await asyncio.sleep(0.1)  # let usage task flush

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(LLMUsage).where(LLMUsage.provider == "mock"))
        rows = result.scalars().all()
    assert len(rows) >= 1


# ---------------------------------------------------------------------------
# 20. GeneratedPage round-trip
# ---------------------------------------------------------------------------

def test_page_round_trip():
    data = _valid_page_dict()
    page = GeneratedPage.model_validate(data)
    dumped = page.model_dump(by_alias=True)
    page2 = GeneratedPage.model_validate(dumped)
    assert page.title == page2.title
    assert page.course_id == page2.course_id
    assert len(page.segments) == len(page2.segments)
