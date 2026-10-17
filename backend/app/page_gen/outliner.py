"""
app/page_gen/outliner.py

Chapter outline generation for owner review.
Proposes page titles, learning goals, prerequisites, and code examples
BEFORE any actual content generation happens.

Usage:
    from app.page_gen.outliner import generate_outline
    outline = await generate_outline(course_id="python", chapter=3, llm_router=router)
    # Write to docs/outlines/chapter-3.md for owner review
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.config import get_settings
from app.llm.router import LLMError, LLMRouter, get_llm_router

log = logging.getLogger(__name__)


@dataclass
class PageOutline:
    """Proposed outline for a single page."""
    page_number: int
    title: str
    learning_goals: list[str]
    topics: list[str]
    code_example_sketch: str  # Brief description of code to show
    prerequisites: list[str]  # Links to previous pages/concepts


@dataclass
class ChapterOutline:
    """Complete chapter outline with all pages."""
    chapter_number: int
    chapter_title: str
    chapter_summary: str
    total_pages: int
    pages: list[PageOutline]


# Chapter metadata from seed.py
CHAPTER_METADATA = {
    3: {
        "title": "Operators",
        "summary": "Arithmetic, comparison, and logical operators in everyday expressions.",
        "page_count": 7,
    },
    4: {
        "title": "Conditions",
        "summary": "Use if, elif, and else to make your program choose a path.",
        "page_count": 9,
    },
    5: {
        "title": "Loops",
        "summary": "Repeat work with for and while, and make sure every loop can stop.",
        "page_count": 9,
    },
    6: {
        "title": "Functions",
        "summary": "Package logic into reusable functions with parameters and return values.",
        "page_count": 8,
    },
    7: {
        "title": "Lists and Dictionaries",
        "summary": "Store collections, look items up by key, and loop over both.",
        "page_count": 10,
    },
    8: {
        "title": "Files",
        "summary": "Read from and write to text files safely with a with block.",
        "page_count": 7,
    },
    9: {
        "title": "Mini Project",
        "summary": "Combine everything into a small to-do list app that saves to a file.",
        "page_count": 6,
    },
}


OUTLINE_SYSTEM_PROMPT = """\
You are a curriculum designer for a Python programming course taught in Tanglish (Tamil + English).

Your task is to propose a detailed outline for a chapter BEFORE any content is generated.
The outline will be reviewed and edited by the course owner.

Guidelines:
- Each page introduces ONE clear concept
- Page titles are concise (3-6 words)
- Learning goals are specific and testable
- Code examples are simple, runnable, and demonstrate the concept
- Build progressively: earlier pages are prerequisites for later ones
- Reference Chapter 1 (Variables) and Chapter 2 (Data Types) concepts when needed

Return a structured outline in JSON format.
"""


OUTLINE_PROMPT_TEMPLATE = """\
Create a detailed outline for Chapter {chapter}: {chapter_title}.

Chapter summary: {chapter_summary}
Total pages: {total_pages}

For each page, specify:
1. **Title**: Short, descriptive (3-6 words)
2. **Learning goals**: 2-3 specific, testable outcomes for this page
3. **Topics**: List of sub-topics covered
4. **Code example sketch**: Brief description of Python code to demonstrate (not full code, just the idea)
5. **Prerequisites**: What concepts from previous pages/chapters are needed

Return JSON in this exact format:
{{
  "chapter_number": {chapter},
  "chapter_title": "{chapter_title}",
  "chapter_summary": "{chapter_summary}",
  "total_pages": {total_pages},
  "pages": [
    {{
      "page_number": 1,
      "title": "...",
      "learning_goals": ["...", "...", "..."],
      "topics": ["...", "..."],
      "code_example_sketch": "...",
      "prerequisites": ["Chapter 1: Variables", "..."]
    }},
    ...
  ]
}}

Focus on clarity and progressive difficulty. Page 1 should be accessible to someone who just finished Chapter 2.
The final page should tie everything together with practice.
"""


async def generate_outline(
    course_id: str,
    chapter: int,
    llm_router: LLMRouter | None = None,
    dry_run: bool = False,
) -> ChapterOutline:
    """
    Generate a chapter outline using LLM.
    
    Args:
        course_id: Must be "python"
        chapter: Chapter number (3-9)
        llm_router: Optional override for testing
        dry_run: If True, return empty outline without calling LLM
    
    Returns:
        ChapterOutline with proposed pages
    
    Raises:
        ValueError: If chapter not in supported range
        LLMError: If LLM call fails
    """
    if course_id != "python":
        raise ValueError(f"Outline generation only supports Python course, got: {course_id}")
    
    if chapter not in CHAPTER_METADATA:
        raise ValueError(f"Chapter {chapter} not in supported range (3-9)")
    
    meta = CHAPTER_METADATA[chapter]
    
    if dry_run:
        log.info("DRY RUN: Would generate outline for Chapter %d (%d pages)", chapter, meta["page_count"])
        return ChapterOutline(
            chapter_number=chapter,
            chapter_title=meta["title"],
            chapter_summary=meta["summary"],
            total_pages=meta["page_count"],
            pages=[],
        )
    
    router = llm_router or get_llm_router()
    
    prompt = OUTLINE_PROMPT_TEMPLATE.format(
        chapter=chapter,
        chapter_title=meta["title"],
        chapter_summary=meta["summary"],
        total_pages=meta["page_count"],
    )
    
    log.info("Generating outline for Chapter %d: %s", chapter, meta["title"])
    
    try:
        resp = await router.generate_json(
            prompt=prompt,
            schema={},  # Let LLM use the template structure
            system=OUTLINE_SYSTEM_PROMPT,
            temperature=0.7,  # Higher temperature for creative outline generation
            max_tokens=3000,
        )
        
        import json
        data = json.loads(resp.text.strip())
        
        # Parse and validate
        pages = []
        for p in data.get("pages", []):
            pages.append(PageOutline(
                page_number=p["page_number"],
                title=p["title"],
                learning_goals=p.get("learning_goals", []),
                topics=p.get("topics", []),
                code_example_sketch=p.get("code_example_sketch", ""),
                prerequisites=p.get("prerequisites", []),
            ))
        
        outline = ChapterOutline(
            chapter_number=data["chapter_number"],
            chapter_title=data["chapter_title"],
            chapter_summary=data["chapter_summary"],
            total_pages=data["total_pages"],
            pages=pages,
        )
        
        # Validate page count matches metadata
        if len(outline.pages) != meta["page_count"]:
            log.warning(
                "Generated %d pages but chapter metadata specifies %d. Using generated count.",
                len(outline.pages), meta["page_count"]
            )
        
        log.info(
            "Outline generated for Chapter %d: %d pages, provider=%s model=%s",
            chapter, len(outline.pages), resp.provider, resp.model
        )
        
        return outline
        
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        raise LLMError(f"Failed to parse outline JSON: {exc}", provider="unknown") from exc


def format_outline_markdown(outline: ChapterOutline) -> str:
    """
    Format ChapterOutline as Markdown for owner review.
    
    Returns Markdown string suitable for docs/outlines/chapter-N.md
    """
    lines = [
        f"# Chapter {outline.chapter_number}: {outline.chapter_title}",
        "",
        f"**Summary**: {outline.chapter_summary}",
        f"**Total Pages**: {outline.total_pages}",
        "",
        "---",
        "",
        "## Proposed Page Outline",
        "",
        "**Instructions for Owner**:",
        "1. Review each page outline below",
        "2. Edit titles, learning goals, topics, and code sketches as needed",
        "3. Reorder pages if the progression doesn't feel right",
        "4. Approve by running: `python backend/scripts/generate_course.py generate --chapter {} --pages all`",
        "",
        "---",
        "",
    ]
    
    for page in outline.pages:
        lines.extend([
            f"### Page {page.page_number}: {page.title}",
            "",
            "**Learning Goals**:",
        ])
        for goal in page.learning_goals:
            lines.append(f"- {goal}")
        
        lines.extend([
            "",
            "**Topics Covered**:",
        ])
        for topic in page.topics:
            lines.append(f"- {topic}")
        
        lines.extend([
            "",
            f"**Code Example**: {page.code_example_sketch}",
            "",
            "**Prerequisites**:",
        ])
        for prereq in page.prerequisites:
            lines.append(f"- {prereq}")
        
        lines.extend([
            "",
            "---",
            "",
        ])
    
    lines.extend([
        "## Next Steps",
        "",
        "1. **Edit this file** to adjust page titles, topics, or ordering",
        f"2. **Run outline again** (optional): `python backend/scripts/generate_course.py outline --chapter {outline.chapter_number}`",
        f"3. **Approve and generate** (dry-run first): `python backend/scripts/generate_course.py generate --chapter {outline.chapter_number} --dry-run`",
        f"4. **Generate for real**: `python backend/scripts/generate_course.py generate --chapter {outline.chapter_number} --yes`",
        "",
        "Generated pages will be saved as `status=draft` and written to `review/{chapter}/{page}.md` for your review.",
        "",
    ])
    
    return "\n".join(lines)


def save_outline_to_file(outline: ChapterOutline, output_dir: str = "docs/outlines") -> str:
    """
    Save outline as Markdown file.
    
    Returns path to the saved file.
    """
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    filename = f"chapter-{outline.chapter_number}.md"
    filepath = os.path.join(output_dir, filename)
    
    markdown = format_outline_markdown(outline)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(markdown)
    
    log.info("Outline saved to: %s", filepath)
    return filepath
