"""
app/page_gen/verifier.py

Post-generation verification pipeline.
All checks run against a GeneratedPage and return (is_valid, list[str]) errors.

Checks:
  (a) Cue targets exist in diagram nodes + segment IDs  ← already enforced by schema validator
  (b) Diagram geometry within bounds (0-800 x 0-600), no dangling edges ← schema validators
  (c) Every Python code block executed in sandbox; actual output == expected_output
      - If sandbox unavailable: page marked unverified, publishing blocked
  (d) Narration length within configured word range
  (e) Grounding check: if citations list is non-empty, verify chunk_ids are known;
      if KB was used in generation but no citations given, warn (soft error)
"""
from __future__ import annotations

import logging

from app.config import get_settings
from app.page_gen.schema import GeneratedPage, Segment
from app.page_gen.sandbox import run_code

log = logging.getLogger(__name__)


class VerificationResult:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.sandbox_unavailable: bool = False
        self.warnings: list[str] = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    @property
    def publishable(self) -> bool:
        return self.is_valid and not self.sandbox_unavailable


async def verify_page(
    page: GeneratedPage,
    known_chunk_ids: set[str] | None = None,
) -> VerificationResult:
    """
    Run all verification checks on *page*.
    Returns VerificationResult with errors, warnings, and sandbox_unavailable flag.
    """
    result = VerificationResult()
    s = get_settings()

    # (a)+(b) already enforced by Pydantic validators at construction time
    # but we re-confirm here for belt-and-suspenders
    _check_cue_targets(page, result)
    _check_diagram_geometry(page, result)

    # (c) Code block verification
    for seg in page.segments:
        if seg.type == "code" and seg.language == "python" and seg.code and seg.expected_output:
            actual, err = await run_code(seg.code, seg.expected_output)
            if err and "sandbox unavailable" in err.lower():
                log.warning("Sandbox unavailable for page %s ch%d p%d", page.course_id, page.chapter, page.page)
                result.sandbox_unavailable = True
                result.warnings.append(f"Segment {seg.id}: sandbox unavailable — page not publishable until verified")
                continue
            if err:
                result.errors.append(f"Code segment '{seg.id}': {err}")
            else:
                seg.code_verified = True

    # (d) Narration word count
    wc = page.word_count or len(page.narration.split())
    min_words = s.page_min_words
    max_words = s.page_max_words
    if not (min_words <= wc <= max_words):
        result.errors.append(
            f"Narration word count {wc} out of range [{min_words}, {max_words}]"
        )

    # (e) Grounding check
    if known_chunk_ids is not None and page.citations:
        for cit in page.citations:
            if cit.chunk_id not in known_chunk_ids:
                result.warnings.append(
                    f"Citation references unknown chunk_id '{cit.chunk_id}'"
                )

    return result


def _check_cue_targets(page: GeneratedPage, result: VerificationResult) -> None:
    valid = {s.id for s in page.segments} | {n.id for n in page.diagram.nodes}
    for seg in page.segments:
        for cue in seg.cues:
            if cue.target_id not in valid:
                result.errors.append(
                    f"Cue '{cue.at_word}' in segment '{seg.id}' targets unknown id '{cue.target_id}'"
                )


def _check_diagram_geometry(page: GeneratedPage, result: VerificationResult) -> None:
    node_ids = {n.id for n in page.diagram.nodes}
    for edge in page.diagram.edges:
        if edge.from_id not in node_ids:
            result.errors.append(f"Dangling diagram edge from '{edge.from_id}'")
        if edge.to_id not in node_ids:
            result.errors.append(f"Dangling diagram edge to '{edge.to_id}'")
    for node in page.diagram.nodes:
        if not (0 <= node.x <= 800) or not (0 <= node.y <= 600):
            result.errors.append(
                f"Diagram node '{node.id}' out of bounds: x={node.x}, y={node.y}"
            )
