"""
app/page_gen/prompts.py

Prompt templates for the generation pipeline.
All model names and parameters come from settings — nothing hardcoded here.
"""
from __future__ import annotations

import json

from app.page_gen.schema import GeneratedPage

SYSTEM_PROMPT = """\
You are an expert Tamil-English (Tanglish) programming tutor who creates engaging interactive lessons.
Your audience is Tamil-speaking beginners learning Python programming.

LANGUAGE RULES:
- Use natural Tanglish: write in Tamil script mixed with English technical terms
- Technical terms (variable, function, loop, list, etc.) stay in English
- Explanations and conversational text are in Tamil
- Use familiar analogies from Tamil cinema and cricket

CONTENT RULES:
- Python content only. Reject any non-Python course request with a clear error message.
- Every claim from uploaded documents MUST cite the chunk_id in the citations array
- Narration must be between {min_words} and {max_words} words
- Every diagram node must have unique IDs; coordinates within x:0-800, y:0-600
- Code blocks MUST have correct expected_output (will be verified by execution)
- Cue targetId must reference an actual segment id or diagram node id
- No markdown in output — pure JSON only
"""

OUTLINE_PROMPT = """\
You are planning a Python course chapter.

Course: {course_id}
Chapter {chapter}: {chapter_title}
Total pages in chapter: {total_pages}

Generate a brief 1-sentence description of what each page covers.
Return JSON: {{"pages": [{{"page": 1, "topic": "..."}}]}}
"""

PAGE_GENERATION_PROMPT = """\
Generate page {page} of chapter {chapter} for the "{course_id}" Python course.

Chapter topic: {chapter_topic}
Page topic: {page_topic}

RETRIEVED KNOWLEDGE BASE PASSAGES:
{kb_passages}

REQUIREMENTS:
- Title: concise English title for the page
- Narration: Tanglish explanation ({min_words}–{max_words} words)
- Segments: mix of explanation, code (with expected_output), and practice segments
- Diagram: visual representation of the concept with bounded nodes (x:0-800, y:0-600)
- Practice prompts: 2–3 exercises at easy/medium/hard
- Analogies: one movie analogy and one cricket analogy in Tanglish
- Citations: cite any knowledge-base passage you used (use chunk_id from passages above)
- All cue targetIds must match a segment.id or diagram node.id in this same response

Return ONLY valid JSON matching this exact schema:
{schema}
"""

REPAIR_PROMPT = """\
The following GeneratedPage JSON has validation errors. Fix them and return corrected JSON.

ORIGINAL JSON:
{original_json}

VALIDATION ERRORS:
{errors}

Rules to fix:
- Dangling edge: remove or fix the edge to reference an existing node id
- Cue target not found: change targetId to an existing segment.id or diagram node.id
- Word count out of range: expand or trim the narration
- Code output mismatch: fix the expected_output to match the actual code output
- All node ids and segment ids must be unique strings

Return ONLY the corrected JSON. No explanation, no markdown.
"""


def build_page_prompt(
    course_id: str,
    chapter: int,
    page: int,
    chapter_topic: str,
    page_topic: str,
    kb_passages: str,
    min_words: int,
    max_words: int,
) -> str:
    schema = _page_schema_str()
    return PAGE_GENERATION_PROMPT.format(
        course_id=course_id,
        chapter=chapter,
        page=page,
        chapter_topic=chapter_topic,
        page_topic=page_topic,
        kb_passages=kb_passages or "(no knowledge base documents found for this course)",
        min_words=min_words,
        max_words=max_words,
        schema=schema,
    )


def build_system(min_words: int, max_words: int) -> str:
    return SYSTEM_PROMPT.format(min_words=min_words, max_words=max_words)


def build_repair_prompt(original_json: str, errors: list[str]) -> str:
    return REPAIR_PROMPT.format(
        original_json=original_json,
        errors="\n".join(f"- {e}" for e in errors),
    )


def _page_schema_str() -> str:
    """Return a compact JSON schema hint for the LLM."""
    return json.dumps({
        "course_id": "string",
        "chapter": "integer",
        "page": "integer",
        "content_version": "string",
        "personalization_hash": "string",
        "title": "string",
        "narration": "Tanglish string",
        "word_count": "integer",
        "segments": [{
            "id": "unique string",
            "type": "explanation|code|practice|diagram_ref",
            "text": "string",
            "cues": [{"atWord": "string", "action": "highlight|animate|scroll|pulse|reveal", "targetId": "string"}],
            "code": "python code string (for code segments)",
            "language": "python",
            "expected_output": "exact stdout string",
        }],
        "diagram": {
            "nodes": [{"id": "unique", "label": "string", "x": "0-800", "y": "0-600", "w": "10-400", "h": "10-200"}],
            "edges": [{"from": "node_id", "to": "node_id", "label": "string"}],
            "steps": [{"step": "integer", "nodeId": "node_id", "description": "string"}]
        },
        "practice_prompts": [{"id": "unique", "prompt": "string", "difficulty": "easy|medium|hard", "hint": "string"}],
        "analogies": {"movie": "Tanglish string", "cricket": "Tanglish string"},
        "citations": [{"chunk_id": "string", "document_id": "string", "quote": "string"}]
    }, indent=2)
