#!/usr/bin/env python3
"""
backend/scripts/generate_course.py

Command-line interface for Python course content generation.

Commands:
  outline   - Generate chapter outline for owner review (writes to docs/outlines/)
  generate  - Generate page content (after outline approved)
  status    - Report draft/approved/rejected page counts

Examples:
  python backend/scripts/generate_course.py outline --chapter 3
  python backend/scripts/generate_course.py generate --chapter 3 --pages 1-3 --dry-run
  python backend/scripts/generate_course.py generate --chapter 3 --pages all --yes
  python backend/scripts/generate_course.py status
"""
import argparse
import asyncio
import logging
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.page_gen.outliner import generate_outline, save_outline_to_file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


async def cmd_outline(args: argparse.Namespace) -> int:
    """
    Generate chapter outline and save to docs/outlines/chapter-N.md
    """
    try:
        outline = await generate_outline(
            course_id="python",
            chapter=args.chapter,
            dry_run=args.dry_run,
        )
        
        if args.dry_run:
            print(f"[DRY RUN] Would generate outline for Chapter {args.chapter}: {outline.chapter_title}")
            print(f"  Expected pages: {outline.total_pages}")
            print("  No LLM calls made.")
            return 0
        
        # Save to file
        output_dir = args.output or "docs/outlines"
        filepath = save_outline_to_file(outline, output_dir=output_dir)
        
        print(f"✓ Outline generated for Chapter {args.chapter}: {outline.chapter_title}")
        print(f"  Pages proposed: {len(outline.pages)}")
        print(f"  Saved to: {filepath}")
        print()
        print("Next steps:")
        print(f"  1. Review and edit: {filepath}")
        print(f"  2. Dry-run generation: python backend/scripts/generate_course.py generate --chapter {args.chapter} --dry-run")
        print(f"  3. Generate pages: python backend/scripts/generate_course.py generate --chapter {args.chapter} --yes")
        
        return 0
        
    except Exception as exc:
        log.error("Outline generation failed: %s", exc, exc_info=True)
        print(f"✗ Error: {exc}", file=sys.stderr)
        return 1


async def cmd_generate(args: argparse.Namespace) -> int:
    """
    Generate page content with full verification pipeline.
    
    Pipeline:
      1. Parse page range
      2. Check usage limits (dry-run mode estimates tokens)
      3. For each page:
         - Check if can regenerate (skip approved unless --force)
         - Get rejection reason feedback if exists
         - Retrieve KB context
         - Generate with LLM (+ repair loop)
         - Verify: schema, code execution, cue targets, narration length
         - Store as draft
         - Record usage
      4. Write review files
      5. Report summary
    """
    from app.config import get_settings
    from app.db.database import AsyncSessionLocal
    from app.page_gen.approval import can_regenerate, get_rejection_reason
    from app.page_gen.pipeline import generate_page, GenerationError
    from app.page_gen.usage_ledger import (
        check_daily_limit,
        enforce_daily_limit,
        estimate_page_generation_tokens,
        record_usage,
    )
    
    settings = get_settings()
    
    # Parse page range
    pages_to_generate = _parse_page_range(args.pages, args.chapter)
    
    # Apply limit
    if args.limit and len(pages_to_generate) > args.limit:
        pages_to_generate = pages_to_generate[:args.limit]
    
    # Apply per-run cap from settings
    if len(pages_to_generate) > settings.llm_page_generation_cap:
        print(f"⚠ Page count {len(pages_to_generate)} exceeds cap {settings.llm_page_generation_cap}")
        pages_to_generate = pages_to_generate[:settings.llm_page_generation_cap]
    
    print(f"Planning to generate {len(pages_to_generate)} pages from Chapter {args.chapter}")
    print(f"Pages: {pages_to_generate}")
    print()
    
    # Estimate tokens
    estimated_tokens = await estimate_page_generation_tokens(len(pages_to_generate))
    print(f"Estimated token usage: {estimated_tokens:,} tokens (~{estimated_tokens // 1000}K)")
    
    # Check daily limit
    async with AsyncSessionLocal() as db:
        within_limit, current, limit = await check_daily_limit(db, estimated_tokens)
        
        if limit > 0:
            print(f"Daily usage: {current:,} / {limit:,} tokens")
            print(f"After generation: ~{current + estimated_tokens:,} tokens")
            
            if not within_limit:
                print(f"✗ ERROR: Would exceed daily limit!")
                return 1
        else:
            print("Daily limit: unlimited")
    
    # Dry run stops here
    if args.dry_run:
        print()
        print("[DRY RUN] No pages generated, no LLM calls made.")
        print(f"Estimated LLM calls: ~{len(pages_to_generate) * 2} (generation + possible repairs)")
        return 0
    
    # Confirm unless --yes
    if not args.yes:
        print()
        response = input(f"Generate {len(pages_to_generate)} pages? [y/N]: ")
        if response.lower() not in ('y', 'yes'):
            print("Cancelled.")
            return 0
    
    print()
    print("=" * 60)
    print("Starting generation...")
    print("=" * 60)
    print()
    
    # Generate pages
    results = []
    for page_num in pages_to_generate:
        print(f"[Chapter {args.chapter}, Page {page_num}]")
        
        async with AsyncSessionLocal() as db:
            # Check if can regenerate
            can_regen, reason = await can_regenerate(
                db=db,
                course_id="python",
                chapter=args.chapter,
                page=page_num,
                force=args.force,
            )
            
            if not can_regen:
                print(f"  ⊗ Skipped: {reason}")
                results.append({"page": page_num, "status": "skipped", "reason": reason})
                continue
            
            # Get rejection feedback
            rejection_feedback = await get_rejection_reason(
                db=db,
                course_id="python",
                chapter=args.chapter,
                page=page_num,
            )
            
            if rejection_feedback:
                print(f"  ℹ Previous rejection: {rejection_feedback[:80]}...")
        
        # Generate
        try:
            print(f"  ⋯ Generating...")
            page = await generate_page(
                course_id="python",
                chapter=args.chapter,
                page=page_num,
                chapter_topic=f"Chapter {args.chapter}",
                page_topic=f"Page {page_num}",
                regenerate=True,
            )
            
            print(f"  ✓ Generated: {page.title}")
            print(f"    - Verified: {page.verified}")
            print(f"    - Word count: {page.word_count}")
            print(f"    - Segments: {len(page.segments)}")
            
            results.append({
                "page": page_num,
                "status": "success",
                "title": page.title,
                "verified": page.verified,
            })
            
        except GenerationError as exc:
            print(f"  ✗ Generation failed: {exc}")
            results.append({"page": page_num, "status": "failed", "error": str(exc)})
        except Exception as exc:
            print(f"  ✗ Unexpected error: {exc}")
            log.error("Generation error for ch%d p%d", args.chapter, page_num, exc_info=True)
            results.append({"page": page_num, "status": "error", "error": str(exc)})
        
        print()
    
    # Summary
    print("=" * 60)
    print("Generation Complete")
    print("=" * 60)
    print()
    
    success = sum(1 for r in results if r["status"] == "success")
    failed = sum(1 for r in results if r["status"] == "failed")
    skipped = sum(1 for r in results if r["status"] == "skipped")
    errors = sum(1 for r in results if r["status"] == "error")
    
    print(f"Success: {success}/{len(pages_to_generate)}")
    print(f"Failed: {failed}")
    print(f"Skipped: {skipped}")
    print(f"Errors: {errors}")
    print()
    
    if success > 0:
        print("Next steps:")
        print(f"  1. Review drafts in review/{args.chapter}/*.md")
        print(f"  2. Approve: python backend/scripts/generate_course.py approve --chapter {args.chapter} --page <N>")
        print(f"  3. Check status: python backend/scripts/generate_course.py status --chapter {args.chapter}")
    
    return 0 if (failed + errors) == 0 else 1


def _parse_page_range(pages_arg: str, chapter: int) -> list[int]:
    """
    Parse page range string into list of page numbers.
    
    Examples:
      "all" -> [1, 2, ..., N] based on chapter metadata
      "1-3" -> [1, 2, 3]
      "1,3,5" -> [1, 3, 5]
      "1-3,7,9-11" -> [1, 2, 3, 7, 9, 10, 11]
    """
    from app.page_gen.outliner import CHAPTER_METADATA
    
    if pages_arg.lower() == "all":
        if chapter in CHAPTER_METADATA:
            total = CHAPTER_METADATA[chapter]["page_count"]
            return list(range(1, total + 1))
        else:
            raise ValueError(f"Chapter {chapter} not in metadata")
    
    pages = []
    parts = pages_arg.split(",")
    
    for part in parts:
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            pages.extend(range(int(start), int(end) + 1))
        else:
            pages.append(int(part))
    
    return sorted(set(pages))  # Remove duplicates and sort


async def cmd_status(args: argparse.Namespace) -> int:
    """
    Report page generation status across all chapters or filtered by chapter.
    """
    from app.db.database import AsyncSessionLocal
    from app.page_gen.approval import get_page_status_counts
    from app.page_gen.outliner import CHAPTER_METADATA
    
    print("Python Course Generation Status")
    print("=" * 60)
    print()
    
    async with AsyncSessionLocal() as db:
        if args.chapter:
            # Single chapter status
            chapters = [args.chapter]
        else:
            # All chapters
            chapters = sorted(CHAPTER_METADATA.keys())
        
        grand_total = {"draft": 0, "approved": 0, "rejected": 0}
        
        for ch in chapters:
            if ch not in CHAPTER_METADATA:
                continue
            
            meta = CHAPTER_METADATA[ch]
            counts = await get_page_status_counts(db=db, course_id="python", chapter=ch)
            
            total_generated = sum(counts.values())
            expected = meta["page_count"]
            
            draft = counts.get("draft", 0)
            approved = counts.get("approved", 0)
            rejected = counts.get("rejected", 0)
            
            grand_total["draft"] += draft
            grand_total["approved"] += approved
            grand_total["rejected"] += rejected
            
            print(f"Chapter {ch}: {meta['title']}")
            print(f"  Expected pages: {expected}")
            print(f"  Generated: {total_generated}")
            print(f"  - Draft: {draft}")
            print(f"  - Approved: {approved}")
            print(f"  - Rejected: {rejected}")
            
            if total_generated < expected:
                remaining = expected - total_generated
                print(f"  ⚠ {remaining} pages not yet generated")
            
            print()
        
        if not args.chapter:
            # Grand totals
            print("-" * 60)
            print("Total across all chapters:")
            print(f"  Draft: {grand_total['draft']}")
            print(f"  Approved: {grand_total['approved']}")
            print(f"  Rejected: {grand_total['rejected']}")
            print(f"  Total: {sum(grand_total.values())}")
    
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Python course content generation CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate outline for Chapter 3
  python backend/scripts/generate_course.py outline --chapter 3
  
  # Dry-run generation (estimate tokens, no LLM calls)
  python backend/scripts/generate_course.py generate --chapter 3 --dry-run
  
  # Generate pages 1-3 of Chapter 3
  python backend/scripts/generate_course.py generate --chapter 3 --pages 1-3 --yes
  
  # Generate all pages of Chapter 4
  python backend/scripts/generate_course.py generate --chapter 4 --pages all --yes
  
  # Check generation status
  python backend/scripts/generate_course.py status
        """,
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Outline command
    parser_outline = subparsers.add_parser(
        "outline",
        help="Generate chapter outline for owner review",
    )
    parser_outline.add_argument(
        "--chapter",
        type=int,
        required=True,
        choices=range(3, 10),
        help="Chapter number (3-9)",
    )
    parser_outline.add_argument(
        "--output",
        type=str,
        default="docs/outlines",
        help="Output directory (default: docs/outlines)",
    )
    parser_outline.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without calling LLM",
    )
    
    # Generate command (placeholder for task #7)
    parser_generate = subparsers.add_parser(
        "generate",
        help="Generate page content (after outline approved)",
    )
    parser_generate.add_argument(
        "--chapter",
        type=int,
        required=True,
        choices=range(3, 10),
        help="Chapter number (3-9)",
    )
    parser_generate.add_argument(
        "--pages",
        type=str,
        default="all",
        help="Pages to generate: 'all', '1-3', '1,3,5', etc. (default: all)",
    )
    parser_generate.add_argument(
        "--limit",
        type=int,
        help="Maximum number of pages to generate in this run",
    )
    parser_generate.add_argument(
        "--dry-run",
        action="store_true",
        help="Estimate token usage without generating content",
    )
    parser_generate.add_argument(
        "--yes",
        action="store_true",
        help="Skip confirmation prompt",
    )
    parser_generate.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if page is approved (USE WITH CAUTION)",
    )
    
    # Status command (placeholder for task #10)
    parser_status = subparsers.add_parser(
        "status",
        help="Report draft/approved/rejected page counts",
    )
    parser_status.add_argument(
        "--chapter",
        type=int,
        choices=range(3, 10),
        help="Filter by chapter (default: all chapters)",
    )
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Route to command handler
    if args.command == "outline":
        return asyncio.run(cmd_outline(args))
    elif args.command == "generate":
        return asyncio.run(cmd_generate(args))
    elif args.command == "status":
        return asyncio.run(cmd_status(args))
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
