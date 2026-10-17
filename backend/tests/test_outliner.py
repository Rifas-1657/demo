"""
tests/test_outliner.py

Tests for chapter outline generation.
"""
import pytest

from app.page_gen.outliner import (
    CHAPTER_METADATA,
    ChapterOutline,
    PageOutline,
    format_outline_markdown,
    generate_outline,
)
from app.llm.providers.mock import MockLLMProvider
from app.llm.router import LLMRouter


def _make_router(provider: MockLLMProvider) -> LLMRouter:
    return LLMRouter(providers=[provider], retry_per_provider=0, backoff_base_s=0)


# ---------------------------------------------------------------------------
# 1. Dry-run: no LLM call
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_outline_dry_run():
    """Dry-run returns empty outline without LLM call."""
    outline = await generate_outline(
        course_id="python",
        chapter=3,
        dry_run=True,
    )
    
    assert outline.chapter_number == 3
    assert outline.chapter_title == "Operators"
    assert outline.total_pages == 7
    assert outline.pages == []  # No pages in dry-run


# ---------------------------------------------------------------------------
# 2. Valid chapter generates outline with mock provider
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_outline_generation_with_mock():
    """Generate outline with mock LLM provider."""
    provider = MockLLMProvider()
    
    # Mock will return a valid outline JSON
    async def _mock_call(prompt: str, schema: dict = None, system: str = "", **kwargs):
        from app.llm import LLMResponse
        import json
        
        outline_json = {
            "chapter_number": 3,
            "chapter_title": "Operators",
            "chapter_summary": "Arithmetic, comparison, and logical operators in everyday expressions.",
            "total_pages": 7,
            "pages": [
                {
                    "page_number": 1,
                    "title": "Addition and Subtraction",
                    "learning_goals": [
                        "Use + and - operators with numbers",
                        "Understand that operators work with variables"
                    ],
                    "topics": ["Basic arithmetic", "Order of operations"],
                    "code_example_sketch": "Simple calculator adding and subtracting scores",
                    "prerequisites": ["Chapter 1: Variables", "Chapter 2: Data Types"]
                },
                {
                    "page_number": 2,
                    "title": "Multiplication and Division",
                    "learning_goals": [
                        "Use * and / operators",
                        "Understand / returns float"
                    ],
                    "topics": ["Multiplication", "Division", "Result types"],
                    "code_example_sketch": "Calculate total price and split bill",
                    "prerequisites": ["Page 1: Addition and Subtraction"]
                }
            ]
        }
        
        return LLMResponse(
            text=json.dumps(outline_json),
            provider="mock",
            model="mock-model",
            tokens_in=100,
            tokens_out=500,
        )
    
    provider._call = _mock_call
    router = _make_router(provider)
    
    outline = await generate_outline(
        course_id="python",
        chapter=3,
        llm_router=router,
    )
    
    assert outline.chapter_number == 3
    assert outline.chapter_title == "Operators"
    assert len(outline.pages) == 2  # Mock returns 2 pages
    assert outline.pages[0].title == "Addition and Subtraction"
    assert len(outline.pages[0].learning_goals) == 2
    assert "Chapter 1: Variables" in outline.pages[0].prerequisites


# ---------------------------------------------------------------------------
# 3. Invalid course raises error
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_outline_invalid_course():
    """Non-Python course raises ValueError."""
    with pytest.raises(ValueError, match="only supports Python"):
        await generate_outline(
            course_id="javascript",
            chapter=3,
        )


# ---------------------------------------------------------------------------
# 4. Invalid chapter raises error
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_outline_invalid_chapter():
    """Chapter outside 3-9 range raises ValueError."""
    with pytest.raises(ValueError, match="not in supported range"):
        await generate_outline(
            course_id="python",
            chapter=1,  # Already complete
        )
    
    with pytest.raises(ValueError, match="not in supported range"):
        await generate_outline(
            course_id="python",
            chapter=10,  # Doesn't exist
        )


# ---------------------------------------------------------------------------
# 5. Markdown formatting
# ---------------------------------------------------------------------------

def test_format_outline_markdown():
    """format_outline_markdown produces correct structure."""
    outline = ChapterOutline(
        chapter_number=3,
        chapter_title="Operators",
        chapter_summary="Test summary",
        total_pages=2,
        pages=[
            PageOutline(
                page_number=1,
                title="Test Page 1",
                learning_goals=["Goal 1", "Goal 2"],
                topics=["Topic A", "Topic B"],
                code_example_sketch="Example sketch",
                prerequisites=["Prereq 1"],
            ),
            PageOutline(
                page_number=2,
                title="Test Page 2",
                learning_goals=["Goal 3"],
                topics=["Topic C"],
                code_example_sketch="Another sketch",
                prerequisites=["Page 1"],
            ),
        ],
    )
    
    markdown = format_outline_markdown(outline)
    
    # Check key sections
    assert "# Chapter 3: Operators" in markdown
    assert "**Total Pages**: 2" in markdown
    assert "### Page 1: Test Page 1" in markdown
    assert "### Page 2: Test Page 2" in markdown
    assert "**Learning Goals**:" in markdown
    assert "- Goal 1" in markdown
    assert "- Goal 2" in markdown
    assert "**Code Example**: Example sketch" in markdown
    assert "**Prerequisites**:" in markdown
    assert "- Prereq 1" in markdown
    assert "## Next Steps" in markdown


# ---------------------------------------------------------------------------
# 6. Chapter metadata is complete
# ---------------------------------------------------------------------------

def test_chapter_metadata_complete():
    """All chapters 3-9 have metadata."""
    for ch in range(3, 10):
        assert ch in CHAPTER_METADATA, f"Chapter {ch} missing from CHAPTER_METADATA"
        meta = CHAPTER_METADATA[ch]
        assert "title" in meta
        assert "summary" in meta
        assert "page_count" in meta
        assert meta["page_count"] > 0
