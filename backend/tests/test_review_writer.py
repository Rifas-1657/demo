"""
tests/test_review_writer.py

Tests for review markdown file generation.
"""
import pytest
import tempfile
from pathlib import Path

from app.page_gen.review_writer import (
    batch_write_reviews,
    format_review_markdown,
    write_review_file,
)
from app.page_gen.schema import (
    Analogies,
    Citation,
    Cue,
    Diagram,
    DiagramNode,
    DiagramEdge,
    DiagramStep,
    GeneratedPage,
    PracticePrompt,
    Segment,
)


def _sample_page() -> GeneratedPage:
    """Create a sample page for testing."""
    return GeneratedPage(
        course_id="python",
        chapter=3,
        page=1,
        content_version="v1",
        personalization_hash="",
        title="Addition and Subtraction",
        narration="Ippo addition and subtraction paarkalaam. Python-la + and - operators use pannalam.",
        word_count=15,
        segments=[
            Segment(
                id="seg-1",
                type="explanation",
                text="Use + to add numbers and - to subtract.",
                cues=[
                    Cue(at_word="add", action="highlight", target_id="seg-1"),
                ],
            ),
            Segment(
                id="seg-2",
                type="code",
                code="x = 5 + 3\nprint(x)",
                language="python",
                expected_output="8",
                code_verified=True,
                cues=[],
            ),
        ],
        diagram=Diagram(
            nodes=[
                DiagramNode(id="n1", label="5", x=100, y=100, w=60, h=40),
                DiagramNode(id="n2", label="+", x=200, y=100, w=60, h=40),
                DiagramNode(id="n3", label="3", x=300, y=100, w=60, h=40),
            ],
            edges=[
                DiagramEdge(from_id="n1", to_id="n2", label=""),
                DiagramEdge(from_id="n2", to_id="n3", label=""),
            ],
            steps=[
                DiagramStep(step=1, node_id="n1", description="Start with 5"),
            ],
        ),
        practice_prompts=[
            PracticePrompt(id="p1", prompt="Calculate 10 + 5", difficulty="easy"),
            PracticePrompt(id="p2", prompt="Calculate 20 - 7", difficulty="medium", hint="Subtract from left to right"),
        ],
        analogies=Analogies(
            movie="Addition is like combining two film scenes into one sequence.",
            cricket="Addition is like adding runs: 4 + 6 = 10 total runs.",
        ),
        citations=[
            Citation(chunk_id="chunk_123", document_id="doc_456", quote="Python supports arithmetic operators"),
        ],
        verified=True,
    )


# ---------------------------------------------------------------------------
# 1. Format review markdown
# ---------------------------------------------------------------------------

def test_format_review_markdown():
    """format_review_markdown produces valid markdown."""
    page = _sample_page()
    markdown = format_review_markdown(page)
    
    # Check key sections
    assert "# Review: Chapter 3, Page 1" in markdown
    assert "**Title**: Addition and Subtraction" in markdown
    assert "## Narration (Tanglish)" in markdown
    assert "## Segments" in markdown
    assert "## Diagram" in markdown
    assert "## Practice Prompts" in markdown
    assert "## Analogies" in markdown
    assert "## Citations" in markdown
    assert "## Review Checklist" in markdown
    
    # Check content
    assert "Ippo addition and subtraction" in markdown
    assert "x = 5 + 3" in markdown
    assert "expected_output" in markdown.lower() or "Expected Output" in markdown
    assert "Addition is like combining" in markdown
    assert "chunk_123" in markdown


# ---------------------------------------------------------------------------
# 2. Write review file
# ---------------------------------------------------------------------------

def test_write_review_file():
    """write_review_file creates markdown file at correct path."""
    page = _sample_page()
    
    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = write_review_file(page, output_dir=tmpdir)
        
        assert Path(filepath).exists()
        assert filepath.endswith("page-1.md")
        assert str(Path(tmpdir) / "3" / "page-1.md") == filepath
        
        # Read and verify content
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        assert "# Review: Chapter 3, Page 1" in content
        assert "Addition and Subtraction" in content


# ---------------------------------------------------------------------------
# 3. Batch write reviews
# ---------------------------------------------------------------------------

def test_batch_write_reviews():
    """batch_write_reviews writes multiple files."""
    page1 = _sample_page()
    page2 = GeneratedPage(
        course_id="python",
        chapter=3,
        page=2,
        title="Multiplication",
        narration="Test narration",
        word_count=2,
        segments=[],
        diagram=Diagram(),
        practice_prompts=[],
        analogies=Analogies(),
        citations=[],
    )
    
    with tempfile.TemporaryDirectory() as tmpdir:
        filepaths = batch_write_reviews([page1, page2], output_dir=tmpdir)
        
        assert len(filepaths) == 2
        assert all(Path(fp).exists() for fp in filepaths)
        assert any("page-1.md" in fp for fp in filepaths)
        assert any("page-2.md" in fp for fp in filepaths)


# ---------------------------------------------------------------------------
# 4. Review markdown includes all checklist items
# ---------------------------------------------------------------------------

def test_review_checklist_complete():
    """Review markdown includes complete checklist."""
    page = _sample_page()
    markdown = format_review_markdown(page)
    
    # Check for checklist sections
    assert "### Technical Correctness" in markdown
    assert "### Tanglish Quality" in markdown
    assert "### Content Structure" in markdown
    assert "### No Off-Topic Content" in markdown
    
    # Check for specific items
    assert "All Python syntax is valid" in markdown
    assert "Natural code-switching" in markdown
    assert "Narration length in range" in markdown
    assert "Has 2 analogies" in markdown
    assert "Has 6-10 cues" in markdown
    assert "Stays focused on the page topic" in markdown


# ---------------------------------------------------------------------------
# 5. Review includes approve/reject commands
# ---------------------------------------------------------------------------

def test_review_includes_decision_commands():
    """Review includes copy-paste commands for approve/reject."""
    page = _sample_page()
    markdown = format_review_markdown(page)
    
    assert "## Decision" in markdown
    assert "**Approve**" in markdown
    assert "**Reject**" in markdown
    assert "python backend/scripts/generate_course.py approve" in markdown
    assert "python backend/scripts/generate_course.py reject" in markdown
    assert "--chapter 3 --page 1" in markdown


# ---------------------------------------------------------------------------
# 6. Code verification status shown
# ---------------------------------------------------------------------------

def test_code_verification_status():
    """Code verification status is clearly indicated."""
    page = _sample_page()
    markdown = format_review_markdown(page)
    
    assert "✅" in markdown or "Code verified" in markdown
    assert "actual output matches expected" in markdown


# ---------------------------------------------------------------------------
# 7. Missing analogies highlighted
# ---------------------------------------------------------------------------

def test_missing_analogies_highlighted():
    """Missing analogies are highlighted in checklist."""
    page = GeneratedPage(
        course_id="python",
        chapter=3,
        page=1,
        title="Test",
        narration="Test",
        word_count=1,
        segments=[],
        diagram=Diagram(),
        practice_prompts=[],
        analogies=Analogies(cricket="Test cricket analogy"),  # Missing movie
        citations=[],
    )
    
    markdown = format_review_markdown(page)
    
    # Check checkbox indicators
    assert "cricket: ✓" in markdown
    assert "movie: ✗" in markdown


# ---------------------------------------------------------------------------
# 8. Citations displayed
# ---------------------------------------------------------------------------

def test_citations_displayed():
    """Citations from knowledge base are displayed."""
    page = _sample_page()
    markdown = format_review_markdown(page)
    
    assert "## Citations" in markdown
    assert "chunk_123" in markdown
    assert "doc_456" in markdown
    assert "Python supports arithmetic operators" in markdown


# ---------------------------------------------------------------------------
# 9. No citations message
# ---------------------------------------------------------------------------

def test_no_citations_message():
    """Message shown when no citations."""
    page = GeneratedPage(
        course_id="python",
        chapter=3,
        page=1,
        title="Test",
        narration="Test",
        word_count=1,
        segments=[],
        diagram=Diagram(),
        practice_prompts=[],
        analogies=Analogies(),
        citations=[],  # Empty
    )
    
    markdown = format_review_markdown(page)
    
    assert "No citations" in markdown
    assert "no knowledge base documents" in markdown.lower()


# ---------------------------------------------------------------------------
# 10. Diagram structure shown
# ---------------------------------------------------------------------------

def test_diagram_structure_shown():
    """Diagram nodes, edges, and steps are listed."""
    page = _sample_page()
    markdown = format_review_markdown(page)
    
    assert "**Nodes**: 3" in markdown
    assert "`n1`: 5" in markdown
    assert "**Edges**: 2" in markdown
    assert "`n1` → `n2`" in markdown
    assert "**Animation Steps**: 1" in markdown
    assert "Start with 5" in markdown
