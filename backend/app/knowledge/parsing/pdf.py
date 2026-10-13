"""
app/knowledge/parsing/pdf.py

PDF parser: pymupdf (fitz) primary, pypdf fallback.

Rules:
- Scanned PDFs with no extractable text → raises ParseError with clear message
  (no OCR in B2).
- Page metadata: page number, any detected headings (bold large font heuristic
  from fitz blocks, or PDF bookmark titles).
- Uses asyncio.to_thread() because pymupdf / pypdf are blocking.
"""
from __future__ import annotations

import asyncio
import io
from typing import Any

from app.knowledge.parsing import ParseError, ParsedPage


_MIN_TEXT_PER_PAGE = 20  # chars; below this → "scanned" heuristic


def _extract_headings_from_blocks(blocks: list[Any]) -> list[str]:
    """
    Heuristic heading extraction from pymupdf block metadata.
    Bold or large-font text at the start of a page → heading candidate.
    """
    headings = []
    for block in blocks:
        if block.get("type") != 0:  # type 0 = text
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                flags = span.get("flags", 0)
                size = span.get("size", 0)
                text = span.get("text", "").strip()
                if not text:
                    continue
                is_bold = bool(flags & 2**4)  # bit 4 = bold
                if is_bold and size >= 12 and len(text) < 120:
                    headings.append(text)
    return headings


def _parse_pdf_sync(data: bytes) -> list[ParsedPage]:
    """Synchronous PDF parsing — runs in thread pool."""
    pages: list[ParsedPage] = []

    # --- Try pymupdf first ---
    try:
        import fitz  # pymupdf

        doc = fitz.open(stream=data, filetype="pdf")
        total_text = 0
        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text("text").strip()
            total_text += len(text)

            # Extract headings via block metadata
            blocks = page.get_text("rawdict").get("blocks", [])
            headings = _extract_headings_from_blocks(blocks)

            pages.append(ParsedPage(
                page_number=page_index + 1,
                text=text,
                headings=headings,
            ))
        doc.close()

        # Scanned PDF check
        if len(pages) == 0:
            raise ParseError(
                "PDF has no pages or could not be read."
            )
        if total_text < _MIN_TEXT_PER_PAGE * len(pages):
            raise ParseError(
                "This PDF appears to be scanned or image-only (no extractable text). "
                "OCR is not supported in B2. Please upload a text-based PDF."
            )
        return pages

    except ImportError:
        pass  # fall through to pypdf

    # --- Fallback: pypdf ---
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    total_text = 0
    for page_index, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        total_text += len(text)
        pages.append(ParsedPage(
            page_number=page_index + 1,
            text=text,
            headings=[],  # pypdf doesn't give rich block metadata
        ))

    if len(pages) == 0:
        raise ParseError("PDF has no pages or could not be read.")
    if len(pages) > 0 and total_text < _MIN_TEXT_PER_PAGE * len(pages):
        raise ParseError(
            "This PDF appears to be scanned or image-only (no extractable text). "
            "OCR is not supported in B2. Please upload a text-based PDF."
        )
    return pages


async def parse_pdf(data: bytes) -> list[ParsedPage]:
    try:
        return await asyncio.to_thread(_parse_pdf_sync, data)
    except ParseError:
        raise
    except Exception as exc:
        raise ParseError(f"PDF parsing failed: {exc}") from exc
