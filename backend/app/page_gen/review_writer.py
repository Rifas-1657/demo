"""
app/page_gen/review_writer.py

Write generated pages as review markdown files for human approval.

Each draft page gets a review file at review/<chapter>/<page>.md with:
  - Narration text
  - List of factual claims to verify
  - Code blocks with verified output
  - Diagram structure
  - Cues list
  - Review checklist
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from app.page_gen.schema import GeneratedPage

log = logging.getLogger(__name__)


def write_review_file(
    page: GeneratedPage,
    output_dir: str = "review",
) -> str:
    """
    Write a review markdown file for a generated page.
    
    Args:
        page: Generated page to review
        output_dir: Base directory for review files (default: review/)
    
    Returns:
        Path to the written file
    """
    chapter_dir = Path(output_dir) / str(page.chapter)
    chapter_dir.mkdir(parents=True, exist_ok=True)
    
    filename = f"page-{page.page}.md"
    filepath = chapter_dir / filename
    
    markdown = format_review_markdown(page)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(markdown)
    
    log.info("Review file written: %s", filepath)
    return str(filepath)


def format_review_markdown(page: GeneratedPage) -> str:
    """
    Format a GeneratedPage as review markdown.
    
    Returns markdown string with all page content for human review.
    """
    lines = [
        f"# Review: Chapter {page.chapter}, Page {page.page}",
        "",
        f"**Title**: {page.title}",
        f"**Course**: {page.course_id}",
        f"**Status**: {page.verified}",
        f"**Word Count**: {page.word_count}",
        "",
        "---",
        "",
        "## Narration (Tanglish)",
        "",
        page.narration,
        "",
        f"*Word count: {page.word_count} (target: 120-200)*",
        "",
        "---",
        "",
        "## Segments",
        "",
    ]
    
    for seg in page.segments:
        lines.append(f"### Segment: {seg.id} ({seg.type})")
        lines.append("")
        
        if seg.text:
            lines.append(seg.text)
            lines.append("")
        
        if seg.code:
            lines.append("**Code**:")
            lines.append(f"```{seg.language}")
            lines.append(seg.code)
            lines.append("```")
            lines.append("")
            
            if seg.expected_output:
                lines.append("**Expected Output**:")
                lines.append("```")
                lines.append(seg.expected_output)
                lines.append("```")
                lines.append("")
            
            if seg.code_verified:
                lines.append("✅ **Code verified** (actual output matches expected)")
            else:
                lines.append("⚠️ **Code not verified** (sandbox unavailable or output mismatch)")
            lines.append("")
        
        if seg.cues:
            lines.append(f"**Cues**: {len(seg.cues)}")
            for cue in seg.cues:
                lines.append(f"  - `{cue.at_word}` → {cue.action} → `{cue.target_id}`")
            lines.append("")
    
    lines.extend([
        "---",
        "",
        "## Diagram",
        "",
    ])
    
    if page.diagram.nodes:
        lines.append(f"**Nodes**: {len(page.diagram.nodes)}")
        lines.append("")
        for node in page.diagram.nodes:
            lines.append(f"- `{node.id}`: {node.label} at ({node.x}, {node.y}) size {node.w}×{node.h}")
        lines.append("")
    else:
        lines.append("*No diagram nodes*")
        lines.append("")
    
    if page.diagram.edges:
        lines.append(f"**Edges**: {len(page.diagram.edges)}")
        lines.append("")
        for edge in page.diagram.edges:
            label = f" [{edge.label}]" if edge.label else ""
            lines.append(f"- `{edge.from_id}` → `{edge.to_id}`{label}")
        lines.append("")
    
    if page.diagram.steps:
        lines.append(f"**Animation Steps**: {len(page.diagram.steps)}")
        lines.append("")
        for step in page.diagram.steps:
            lines.append(f"{step.step}. {step.node_id}: {step.description}")
        lines.append("")
    
    lines.extend([
        "---",
        "",
        "## Practice Prompts",
        "",
    ])
    
    for i, prompt in enumerate(page.practice_prompts, 1):
        lines.append(f"{i}. **{prompt.difficulty.upper()}**: {prompt.prompt}")
        if prompt.hint:
            lines.append(f"   *Hint: {prompt.hint}*")
        lines.append("")
    
    lines.extend([
        "---",
        "",
        "## Analogies",
        "",
    ])
    
    if page.analogies.cricket:
        lines.append(f"**Cricket**: {page.analogies.cricket}")
        lines.append("")
    
    if page.analogies.movie:
        lines.append(f"**Movie**: {page.analogies.movie}")
        lines.append("")
    
    lines.extend([
        "---",
        "",
        "## Citations",
        "",
    ])
    
    if page.citations:
        for cit in page.citations:
            lines.append(f"- **Chunk**: `{cit.chunk_id}` (doc: `{cit.document_id}`)")
            if cit.quote:
                lines.append(f"  > {cit.quote}")
            lines.append("")
    else:
        lines.append("*No citations (no knowledge base documents used)*")
        lines.append("")
    
    lines.extend([
        "---",
        "",
        "## Factual Claims to Verify",
        "",
        "*Review each technical claim in the narration and segments:*",
        "",
    ])
    
    # Extract claims from segments
    claims = _extract_claims(page)
    if claims:
        for claim in claims:
            lines.append(f"- [ ] {claim}")
        lines.append("")
    else:
        lines.append("*Auto-extracted claims will appear here*")
        lines.append("")
    
    lines.extend([
        "---",
        "",
        "## Review Checklist",
        "",
        "### Technical Correctness",
        "- [ ] All Python syntax is valid",
        "- [ ] Code output is correct (verified by sandbox)",
        "- [ ] Technical claims are accurate",
        "- [ ] No unverified claims without citations",
        "",
        "### Tanglish Quality",
        "- [ ] Natural code-switching (Tamil + English technical terms)",
        "- [ ] Sentence length appropriate (15-25 words avg)",
        "- [ ] Tone is encouraging and patient",
        "- [ ] No awkward phrasing",
        "",
        "### Content Structure",
        f"- [ ] Narration length in range (currently: {page.word_count}, target: 120-200)",
        f"- [ ] Has 2 analogies (cricket: {'✓' if page.analogies.cricket else '✗'}, movie: {'✓' if page.analogies.movie else '✗'})",
        f"- [ ] Has 6-10 cues (currently: {_count_cues(page)})",
        "- [ ] All cue targets exist (validated by schema)",
        "- [ ] Code blocks have expected output",
        "- [ ] Has 2 practice prompts (easy + medium/hard)",
        "",
        "### No Off-Topic Content",
        "- [ ] Stays focused on the page topic",
        "- [ ] No tangents or unrelated examples",
        "- [ ] Python only (no other languages)",
        "",
        "---",
        "",
        "## Decision",
        "",
        "**Approve** (ready to publish):",
        "```bash",
        f"python backend/scripts/generate_course.py approve --chapter {page.chapter} --page {page.page}",
        "```",
        "",
        "**Reject** (needs regeneration with feedback):",
        "```bash",
        f"python backend/scripts/generate_course.py reject --chapter {page.chapter} --page {page.page} --reason \"Your feedback here\"",
        "```",
        "",
        "---",
        "",
        f"*Generated: {page.content_version} | Verified: {page.verified}*",
    ])
    
    return "\n".join(lines)


def _extract_claims(page: GeneratedPage) -> list[str]:
    """
    Extract verifiable claims from page content.
    
    This is a simple heuristic - in production you'd use an LLM to extract claims.
    For now, we extract sentences with technical indicators.
    """
    claims = []
    
    # Look for technical statements in segments
    for seg in page.segments:
        if seg.type == "explanation" and seg.text:
            # Simple heuristic: sentences with technical keywords
            sentences = seg.text.split(". ")
            for sent in sentences:
                lower = sent.lower()
                if any(keyword in lower for keyword in [
                    "python", "returns", "always", "never", "must", "cannot",
                    "will", "error", "raises", "default", "automatically"
                ]):
                    claims.append(sent.strip())
    
    return claims[:10]  # Limit to 10 claims


def _count_cues(page: GeneratedPage) -> int:
    """Count total cues across all segments."""
    return sum(len(seg.cues) for seg in page.segments)


def batch_write_reviews(
    pages: list[GeneratedPage],
    output_dir: str = "review",
) -> list[str]:
    """
    Write review files for multiple pages.
    
    Args:
        pages: List of generated pages
        output_dir: Base directory for review files
    
    Returns:
        List of written file paths
    """
    filepaths = []
    for page in pages:
        try:
            path = write_review_file(page, output_dir=output_dir)
            filepaths.append(path)
        except Exception as exc:
            log.error("Failed to write review for ch%d p%d: %s", page.chapter, page.page, exc)
    
    return filepaths
