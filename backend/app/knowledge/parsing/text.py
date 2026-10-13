"""
app/knowledge/parsing/text.py

Plain text (.txt) and Markdown (.md) parser.

- MD: extracts ATX headings (#, ##, ###) as heading path metadata.
- TXT: no headings, split into logical pages by blank-line groups.
- Both: split into logical pages of ~2000 chars.
"""
from __future__ import annotations

import asyncio
import re

from app.knowledge.parsing import ParseError, ParsedPage

_LOGICAL_PAGE_CHARS = 2000
_ATX_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)


def _parse_text_sync(data: bytes, mime_type: str) -> list[ParsedPage]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = data.decode("latin-1")
        except Exception as exc:
            raise ParseError(f"Could not decode text file: {exc}") from exc

    if not text.strip():
        raise ParseError("Text document contains no content.")

    is_markdown = mime_type == "text/markdown"
    lines = text.splitlines(keepends=True)

    pages: list[ParsedPage] = []
    page_number = 1
    current_lines: list[str] = []
    current_headings: list[str] = []
    heading_stack: list[str] = []
    char_count = 0

    def flush_page() -> None:
        nonlocal char_count, page_number, current_lines, current_headings
        page_text = "".join(current_lines).strip()
        if page_text:
            pages.append(ParsedPage(
                page_number=page_number,
                text=page_text,
                headings=list(current_headings),
            ))
            page_number += 1
        current_lines = []
        char_count = 0
        current_headings = list(heading_stack)

    in_code_block = False
    for line in lines:
        stripped = line.strip()

        # Track fenced code blocks (never split mid-block)
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_code_block = not in_code_block

        # ATX heading detection in markdown
        if is_markdown and not in_code_block:
            m = _ATX_HEADING_RE.match(stripped)
            if m:
                level = len(m.group(1))
                title = m.group(2).strip()
                if level == 1:
                    heading_stack = [title]
                elif level == 2:
                    heading_stack = heading_stack[:1] + [title]
                elif level >= 3:
                    heading_stack = heading_stack[:2] + [title]
                current_headings = list(heading_stack)

        current_lines.append(line)
        char_count += len(line)

        # Flush on threshold (but not mid-code-block)
        if char_count >= _LOGICAL_PAGE_CHARS and not in_code_block:
            flush_page()

    flush_page()
    return pages


async def parse_text(data: bytes, mime_type: str) -> list[ParsedPage]:
    try:
        return await asyncio.to_thread(_parse_text_sync, data, mime_type)
    except ParseError:
        raise
    except Exception as exc:
        raise ParseError(f"Text parsing failed: {exc}") from exc
