"""
app/knowledge/chunking/__init__.py

Structure-aware chunker.

Constraints:
  - Target: 400–600 tokens per chunk (tiktoken cl100k_base)
  - Overlap: 12 % of chunk size (≈ 50-72 tokens)
  - Never split code fences (``` ... ```)
  - Each chunk carries its heading_path and source page_number
  - Output: list[Chunk]
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.knowledge.parsing import ParsedPage

try:
    import tiktoken
    _enc = tiktoken.get_encoding("cl100k_base")
    def _count_tokens(text: str) -> int:
        return len(_enc.encode(text))
except Exception:
    # Fallback: rough approximation (4 chars ≈ 1 token)
    def _count_tokens(text: str) -> int:  # type: ignore[misc]
        return max(1, len(text) // 4)


TARGET_MIN_TOKENS = 400
TARGET_MAX_TOKENS = 600
OVERLAP_RATIO     = 0.12
CODE_FENCE_RE     = re.compile(r"^(`{3,}|~{3,})", re.MULTILINE)


@dataclass
class Chunk:
    chunk_index: int
    text: str
    heading_path: list[str]
    page_number: int
    token_count: int


def chunk_pages(pages: list[ParsedPage]) -> list[Chunk]:
    """
    Convert parsed pages into overlapping token-bounded chunks.
    Heading path is carried from the page that started the chunk.
    """
    chunks: list[Chunk] = []
    overlap_tokens = int(TARGET_MAX_TOKENS * OVERLAP_RATIO)  # ≈ 72

    # Split each page into sentences/paragraphs, then pack into chunks
    for page in pages:
        sentences = _split_into_sentences(page.text)
        if not sentences:
            continue

        buffer: list[str] = []
        buffer_tokens = 0
        chunk_index = len(chunks)

        i = 0
        while i < len(sentences):
            sent = sentences[i]
            sent_tokens = _count_tokens(sent)

            if buffer_tokens + sent_tokens <= TARGET_MAX_TOKENS:
                buffer.append(sent)
                buffer_tokens += sent_tokens
                i += 1
            else:
                if buffer_tokens >= TARGET_MIN_TOKENS or buffer:
                    _flush(chunks, buffer, page, chunk_index)
                    chunk_index += 1
                    # Overlap: keep tail sentences whose total ≤ overlap_tokens
                    buffer, buffer_tokens = _overlap_tail(buffer, overlap_tokens)
                else:
                    # Single sentence exceeds max — include anyway
                    buffer.append(sent)
                    buffer_tokens += sent_tokens
                    i += 1

        if buffer:
            _flush(chunks, buffer, page, chunk_index)

    # Re-number globally
    for idx, chunk in enumerate(chunks):
        chunk.chunk_index = idx

    return chunks


def _flush(chunks: list[Chunk], buffer: list[str], page: ParsedPage, idx: int) -> None:
    text = " ".join(buffer).strip()
    if text:
        chunks.append(Chunk(
            chunk_index=idx,
            text=text,
            heading_path=list(page.headings),
            page_number=page.page_number,
            token_count=_count_tokens(text),
        ))


def _overlap_tail(buffer: list[str], max_tokens: int) -> tuple[list[str], int]:
    """Return the suffix of buffer whose total token count ≤ max_tokens."""
    tail: list[str] = []
    total = 0
    for sent in reversed(buffer):
        t = _count_tokens(sent)
        if total + t <= max_tokens:
            tail.insert(0, sent)
            total += t
        else:
            break
    return tail, total


def _split_into_sentences(text: str) -> list[str]:
    """
    Split text into sentence-like units while preserving code fences intact.
    Code fences (``` or ~~~) are never broken.
    """
    parts: list[str] = []
    in_fence = False
    fence_buf: list[str] = []
    fence_marker = ""

    for line in text.splitlines(keepends=True):
        stripped = line.rstrip()
        m = CODE_FENCE_RE.match(stripped)
        if m:
            if not in_fence:
                in_fence = True
                fence_marker = m.group(1)[0] * len(m.group(1))
                fence_buf = [line]
            elif stripped.startswith(fence_marker):
                fence_buf.append(line)
                parts.append("".join(fence_buf))
                fence_buf = []
                in_fence = False
            else:
                fence_buf.append(line)
        elif in_fence:
            fence_buf.append(line)
        else:
            # Non-code line — split on sentence-ending punctuation
            subs = re.split(r"(?<=[.!?])\s+", line)
            parts.extend(s.strip() for s in subs if s.strip())

    if fence_buf:
        parts.append("".join(fence_buf))  # unclosed fence

    return [p for p in parts if p.strip()]
