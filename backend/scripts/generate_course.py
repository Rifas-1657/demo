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
    Generate page content (placeholder - will be implemented in task #7)
    """
    print("Page generation not yet implemented (task #7)")
    print(f"Would generate: Chapter {args.chapter}, pages {args.pages}")
    print(f"Dry run: {args.dry_run}")
    print(f"Force: {args.force}")
    print(f"Limit: {args.limit}")
    return 0


async def cmd_status(args: argparse.Namespace) -> int:
    """
    Report page generation status (placeholder - will be implemented in task #10)
    """
    print("Status reporting not yet implemented (task #10)")
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
