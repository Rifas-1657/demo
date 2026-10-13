"""
app/knowledge/parsing/docx.py

DOCX parser via python-docx.
Preserves heading path (Heading 1/2/3 styles) and paragraph page tracking.
Since DOCX has no native page numbers in the element tree, we assign
logical "pages" based on section boundaries or every ~2000 chars.
"""
from __future__ import annotations

import asyncio
import io

from app.knowledge.parsing import ParseError, ParsedPage

_LOGICAL_PAGE_CHARS = 2000  # approx chars per logical page


def _parse_docx_sync(data: bytes) -> list[ParsedPage]:
    from docx import Document  # python-docx
    from docx.oxml.ns import qn

    doc = Document(io.BytesIO(data))

    heading_stack: list[str] = []  # current heading path
    current_text_parts: list[str] = []
    current_headings: list[str] = []
    pages: list[ParsedPage] = []
    page_number = 1
    char_count = 0

    def flush_page() -> None:
        nonlocal char_count, page_number, current_text_parts, current_headings
        text = "\n".join(current_text_parts).strip()
        if text:
            pages.append(ParsedPage(
                page_number=page_number,
                text=text,
                headings=list(current_headings),
            ))
            page_number += 1
        current_text_parts = []
        char_count = 0
        current_headings = list(heading_stack)

    for para in doc.paragraphs:
        style_name = para.style.name if para.style else ""
        text = para.text.strip()

        # Update heading path
        if style_name.startswith("Heading 1"):
            heading_stack = [text] if text else heading_stack
            current_headings = list(heading_stack)
        elif style_name.startswith("Heading 2"):
            heading_stack = heading_stack[:1] + ([text] if text else [])
            current_headings = list(heading_stack)
        elif style_name.startswith("Heading 3"):
            heading_stack = heading_stack[:2] + ([text] if text else [])
            current_headings = list(heading_stack)

        if text:
            current_text_parts.append(text)
            char_count += len(text)

        # Flush logical page on page break XML element or char threshold
        has_page_break = False
        for run in para.runs:
            if run._element.xml and "w:br" in run._element.xml and 'type="page"' in run._element.xml:
                has_page_break = True
                break

        if has_page_break or char_count >= _LOGICAL_PAGE_CHARS:
            flush_page()

    flush_page()  # final flush

    if not pages:
        raise ParseError("DOCX document contains no extractable text.")
    return pages


async def parse_docx(data: bytes) -> list[ParsedPage]:
    try:
        return await asyncio.to_thread(_parse_docx_sync, data)
    except ParseError:
        raise
    except Exception as exc:
        raise ParseError(f"DOCX parsing failed: {exc}") from exc
