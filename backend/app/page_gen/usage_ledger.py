"""
app/page_gen/usage_ledger.py

LLM usage tracking and daily limit enforcement.

Per-day token ledger to prevent exceeding budget:
  - Track tokens_in + tokens_out per provider/model/day
  - Check against configured daily limits before generation
  - Provide dry-run estimates for token usage
  - Report usage summary for admin review
"""
from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Dict, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import LLMUsage

log = logging.getLogger(__name__)


class UsageLimitExceeded(Exception):
    """Raised when daily LLM usage limit would be exceeded."""
    def __init__(self, message: str, current_usage: int, limit: int):
        super().__init__(message)
        self.current_usage = current_usage
        self.limit = limit


async def record_usage(
    db: AsyncSession,
    provider: str,
    model: str,
    tokens_in: int,
    tokens_out: int,
    date_str: str | None = None,
) -> LLMUsage:
    """
    Record LLM usage in the ledger.
    
    Args:
        db: Database session
        provider: Provider name (gemini, groq, openrouter, mock)
        model: Model identifier
        tokens_in: Input tokens
        tokens_out: Output tokens
        date_str: ISO date (YYYY-MM-DD), defaults to today
    
    Returns:
        Created LLMUsage record
    """
    if date_str is None:
        date_str = date.today().isoformat()
    
    usage = LLMUsage(
        date=date_str,
        provider=provider,
        model=model,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
    )
    db.add(usage)
    await db.commit()
    await db.refresh(usage)
    
    log.debug(
        "Recorded usage: %s/%s %d in + %d out = %d total on %s",
        provider, model, tokens_in, tokens_out, tokens_in + tokens_out, date_str
    )
    
    return usage


async def get_daily_usage(
    db: AsyncSession,
    date_str: str | None = None,
    provider: str | None = None,
) -> Dict[str, int]:
    """
    Get total token usage for a specific day.
    
    Args:
        db: Database session
        date_str: ISO date (YYYY-MM-DD), defaults to today
        provider: Filter by provider (optional)
    
    Returns:
        Dict with keys: tokens_in, tokens_out, total_tokens, call_count
    """
    if date_str is None:
        date_str = date.today().isoformat()
    
    query = select(
        func.sum(LLMUsage.tokens_in).label("tokens_in"),
        func.sum(LLMUsage.tokens_out).label("tokens_out"),
        func.count(LLMUsage.id).label("call_count"),
    ).where(LLMUsage.date == date_str)
    
    if provider:
        query = query.where(LLMUsage.provider == provider)
    
    result = await db.execute(query)
    row = result.one()
    
    tokens_in = row.tokens_in or 0
    tokens_out = row.tokens_out or 0
    
    return {
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "total_tokens": tokens_in + tokens_out,
        "call_count": row.call_count or 0,
    }


async def check_daily_limit(
    db: AsyncSession,
    estimated_tokens: int,
    date_str: str | None = None,
) -> Tuple[bool, int, int]:
    """
    Check if adding estimated_tokens would exceed daily limit.
    
    Args:
        db: Database session
        estimated_tokens: Tokens we plan to use
        date_str: ISO date (YYYY-MM-DD), defaults to today
    
    Returns:
        (within_limit: bool, current_usage: int, limit: int)
    """
    settings = get_settings()
    limit = settings.llm_daily_token_limit
    
    if limit <= 0:
        # No limit configured
        return True, 0, 0
    
    usage = await get_daily_usage(db, date_str=date_str)
    current = usage["total_tokens"]
    
    would_exceed = (current + estimated_tokens) > limit
    
    if would_exceed:
        log.warning(
            "Daily token limit would be exceeded: current=%d + estimated=%d = %d > limit=%d",
            current, estimated_tokens, current + estimated_tokens, limit
        )
    
    return not would_exceed, current, limit


async def enforce_daily_limit(
    db: AsyncSession,
    estimated_tokens: int,
    date_str: str | None = None,
) -> None:
    """
    Enforce daily token limit by raising UsageLimitExceeded if exceeded.
    
    Args:
        db: Database session
        estimated_tokens: Tokens we plan to use
        date_str: ISO date (YYYY-MM-DD), defaults to today
    
    Raises:
        UsageLimitExceeded: If limit would be exceeded
    """
    within_limit, current, limit = await check_daily_limit(db, estimated_tokens, date_str)
    
    if not within_limit:
        raise UsageLimitExceeded(
            f"Daily token limit exceeded: {current} + {estimated_tokens} = {current + estimated_tokens} > {limit}",
            current_usage=current,
            limit=limit,
        )


async def get_usage_by_provider(
    db: AsyncSession,
    date_str: str | None = None,
) -> Dict[str, Dict[str, int]]:
    """
    Get usage breakdown by provider for a specific day.
    
    Args:
        db: Database session
        date_str: ISO date (YYYY-MM-DD), defaults to today
    
    Returns:
        Dict[provider, Dict[metric, value]]
        Example: {"gemini": {"tokens_in": 1000, "tokens_out": 500, ...}, ...}
    """
    if date_str is None:
        date_str = date.today().isoformat()
    
    query = select(
        LLMUsage.provider,
        func.sum(LLMUsage.tokens_in).label("tokens_in"),
        func.sum(LLMUsage.tokens_out).label("tokens_out"),
        func.count(LLMUsage.id).label("call_count"),
    ).where(
        LLMUsage.date == date_str
    ).group_by(LLMUsage.provider)
    
    result = await db.execute(query)
    rows = result.all()
    
    breakdown = {}
    for row in rows:
        tokens_in = row.tokens_in or 0
        tokens_out = row.tokens_out or 0
        breakdown[row.provider] = {
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "total_tokens": tokens_in + tokens_out,
            "call_count": row.call_count or 0,
        }
    
    return breakdown


async def estimate_page_generation_tokens(
    num_pages: int,
    avg_tokens_per_page: int = 3000,
) -> int:
    """
    Estimate total tokens needed for generating N pages.
    
    Conservative estimate based on:
      - ~1000 tokens input (prompt + KB context)
      - ~2000 tokens output (generated page JSON)
      - ~500 tokens for repair attempts (avg)
    
    Args:
        num_pages: Number of pages to generate
        avg_tokens_per_page: Average tokens per page (input + output)
    
    Returns:
        Estimated total tokens
    """
    return num_pages * avg_tokens_per_page


async def get_usage_report(
    db: AsyncSession,
    start_date: str | None = None,
    end_date: str | None = None,
) -> Dict[str, any]:
    """
    Generate usage report for a date range.
    
    Args:
        db: Database session
        start_date: ISO date (YYYY-MM-DD), defaults to today
        end_date: ISO date (YYYY-MM-DD), defaults to today
    
    Returns:
        Dict with usage statistics and daily breakdown
    """
    if start_date is None:
        start_date = date.today().isoformat()
    if end_date is None:
        end_date = start_date
    
    # Total usage in range
    query = select(
        func.sum(LLMUsage.tokens_in).label("tokens_in"),
        func.sum(LLMUsage.tokens_out).label("tokens_out"),
        func.count(LLMUsage.id).label("call_count"),
    ).where(
        LLMUsage.date >= start_date,
        LLMUsage.date <= end_date,
    )
    
    result = await db.execute(query)
    row = result.one()
    
    tokens_in = row.tokens_in or 0
    tokens_out = row.tokens_out or 0
    
    # Daily breakdown
    daily_query = select(
        LLMUsage.date,
        func.sum(LLMUsage.tokens_in).label("tokens_in"),
        func.sum(LLMUsage.tokens_out).label("tokens_out"),
        func.count(LLMUsage.id).label("call_count"),
    ).where(
        LLMUsage.date >= start_date,
        LLMUsage.date <= end_date,
    ).group_by(LLMUsage.date).order_by(LLMUsage.date)
    
    daily_result = await db.execute(daily_query)
    daily_rows = daily_result.all()
    
    daily_breakdown = []
    for row in daily_rows:
        day_in = row.tokens_in or 0
        day_out = row.tokens_out or 0
        daily_breakdown.append({
            "date": row.date,
            "tokens_in": day_in,
            "tokens_out": day_out,
            "total_tokens": day_in + day_out,
            "call_count": row.call_count or 0,
        })
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_tokens_in": tokens_in,
        "total_tokens_out": tokens_out,
        "total_tokens": tokens_in + tokens_out,
        "total_calls": row.call_count or 0,
        "daily_breakdown": daily_breakdown,
    }


def format_usage_report(report: Dict[str, any]) -> str:
    """
    Format usage report as human-readable text.
    
    Args:
        report: Output from get_usage_report()
    
    Returns:
        Formatted report string
    """
    lines = [
        f"LLM Usage Report: {report['start_date']} to {report['end_date']}",
        "=" * 60,
        f"Total Calls: {report['total_calls']:,}",
        f"Total Tokens In: {report['total_tokens_in']:,}",
        f"Total Tokens Out: {report['total_tokens_out']:,}",
        f"Total Tokens: {report['total_tokens']:,}",
        "",
    ]
    
    if report['daily_breakdown']:
        lines.append("Daily Breakdown:")
        lines.append("-" * 60)
        for day in report['daily_breakdown']:
            lines.append(
                f"{day['date']}: {day['total_tokens']:>8,} tokens "
                f"({day['tokens_in']:>6,} in, {day['tokens_out']:>6,} out) "
                f"in {day['call_count']:>3} calls"
            )
    
    return "\n".join(lines)
