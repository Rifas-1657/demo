"""
tests/test_usage_ledger.py

Tests for LLM usage tracking and daily limits.
"""
import pytest
import pytest_asyncio
from datetime import date, timedelta

from app.db.models import LLMUsage
from app.page_gen.usage_ledger import (
    UsageLimitExceeded,
    check_daily_limit,
    enforce_daily_limit,
    estimate_page_generation_tokens,
    format_usage_report,
    get_daily_usage,
    get_usage_by_provider,
    get_usage_report,
    record_usage,
)


# ---------------------------------------------------------------------------
# 1. Record usage
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_record_usage(db_session):
    """record_usage creates LLMUsage record."""
    usage = await record_usage(
        db=db_session,
        provider="gemini",
        model="gemini-1.5-flash",
        tokens_in=1000,
        tokens_out=500,
        date_str="2026-10-17",
    )
    
    assert usage.provider == "gemini"
    assert usage.model == "gemini-1.5-flash"
    assert usage.tokens_in == 1000
    assert usage.tokens_out == 500
    assert usage.date == "2026-10-17"


# ---------------------------------------------------------------------------
# 2. Get daily usage (empty)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_daily_usage_empty(db_session):
    """get_daily_usage returns zeros when no usage."""
    usage = await get_daily_usage(
        db=db_session,
        date_str="2099-12-31",  # Future date with no data
    )
    
    assert usage["tokens_in"] == 0
    assert usage["tokens_out"] == 0
    assert usage["total_tokens"] == 0
    assert usage["call_count"] == 0


# ---------------------------------------------------------------------------
# 3. Get daily usage (with data)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_daily_usage_with_data(db_session):
    """get_daily_usage aggregates multiple records."""
    test_date = "2026-10-17"
    
    # Record multiple usages
    await record_usage(db_session, "gemini", "model-1", 1000, 500, test_date)
    await record_usage(db_session, "groq", "model-2", 800, 400, test_date)
    await record_usage(db_session, "mock", "mock-model", 100, 50, test_date)
    
    usage = await get_daily_usage(db=db_session, date_str=test_date)
    
    assert usage["tokens_in"] == 1900  # 1000 + 800 + 100
    assert usage["tokens_out"] == 950  # 500 + 400 + 50
    assert usage["total_tokens"] == 2850
    assert usage["call_count"] == 3


# ---------------------------------------------------------------------------
# 4. Get daily usage filtered by provider
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_daily_usage_filtered(db_session):
    """get_daily_usage can filter by provider."""
    test_date = "2026-10-18"
    
    await record_usage(db_session, "gemini", "model-1", 1000, 500, test_date)
    await record_usage(db_session, "groq", "model-2", 800, 400, test_date)
    
    gemini_usage = await get_daily_usage(
        db=db_session,
        date_str=test_date,
        provider="gemini"
    )
    
    assert gemini_usage["tokens_in"] == 1000
    assert gemini_usage["tokens_out"] == 500
    assert gemini_usage["call_count"] == 1


# ---------------------------------------------------------------------------
# 5. Check daily limit (within limit)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_check_daily_limit_within(db_session, monkeypatch):
    """check_daily_limit returns True when within limit."""
    # Mock settings to return custom limit
    monkeypatch.setenv("LLM_DAILY_TOKEN_LIMIT", "10000")
    from app.config import get_settings
    get_settings.cache_clear()
    
    test_date = "2026-10-19"
    
    # Use 3,000 tokens
    await record_usage(db_session, "gemini", "model-1", 2000, 1000, test_date)
    
    # Check if we can use 5,000 more (total would be 8,000)
    within, current, limit = await check_daily_limit(
        db=db_session,
        estimated_tokens=5_000,
        date_str=test_date,
    )
    
    assert within is True
    assert current == 3_000
    assert limit == 10_000


# ---------------------------------------------------------------------------
# 6. Check daily limit (would exceed)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_check_daily_limit_would_exceed(db_session, monkeypatch):
    """check_daily_limit returns False when limit would be exceeded."""
    monkeypatch.setenv("LLM_DAILY_TOKEN_LIMIT", "10000")
    from app.config import get_settings
    get_settings.cache_clear()
    
    test_date = "2026-10-20"
    
    # Use 7,000 tokens
    await record_usage(db_session, "gemini", "model-1", 5000, 2000, test_date)
    
    # Check if we can use 5,000 more (total would be 12,000 > 10,000)
    within, current, limit = await check_daily_limit(
        db=db_session,
        estimated_tokens=5_000,
        date_str=test_date,
    )
    
    assert within is False
    assert current == 7_000
    assert limit == 10_000


# ---------------------------------------------------------------------------
# 7. Enforce daily limit (passes)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_enforce_daily_limit_passes(db_session, monkeypatch):
    """enforce_daily_limit does not raise when within limit."""
    monkeypatch.setenv("LLM_DAILY_TOKEN_LIMIT", "10000")
    from app.config import get_settings
    get_settings.cache_clear()
    
    test_date = "2026-10-21"
    
    await record_usage(db_session, "gemini", "model-1", 2000, 1000, test_date)
    
    # Should not raise
    await enforce_daily_limit(
        db=db_session,
        estimated_tokens=5_000,
        date_str=test_date,
    )


# ---------------------------------------------------------------------------
# 8. Enforce daily limit (raises)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_enforce_daily_limit_raises(db_session, monkeypatch):
    """enforce_daily_limit raises UsageLimitExceeded when limit exceeded."""
    monkeypatch.setenv("LLM_DAILY_TOKEN_LIMIT", "10000")
    from app.config import get_settings
    get_settings.cache_clear()
    
    test_date = "2026-10-22"
    
    await record_usage(db_session, "gemini", "model-1", 7000, 2000, test_date)
    
    with pytest.raises(UsageLimitExceeded) as exc_info:
        await enforce_daily_limit(
            db=db_session,
            estimated_tokens=5_000,
            date_str=test_date,
        )
    
    assert exc_info.value.current_usage == 9_000
    assert exc_info.value.limit == 10_000


# ---------------------------------------------------------------------------
# 9. No limit configured (always passes)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_limit_configured(db_session, monkeypatch):
    """check_daily_limit always passes when limit is 0."""
    monkeypatch.setenv("LLM_DAILY_TOKEN_LIMIT", "0")
    from app.config import get_settings
    get_settings.cache_clear()
    
    test_date = "2026-10-23"
    
    await record_usage(db_session, "gemini", "model-1", 1_000_000, 500_000, test_date)
    
    within, current, limit = await check_daily_limit(
        db=db_session,
        estimated_tokens=1_000_000,
        date_str=test_date,
    )
    
    assert within is True
    assert limit == 0


# ---------------------------------------------------------------------------
# 10. Get usage by provider
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_usage_by_provider(db_session):
    """get_usage_by_provider breaks down usage by provider."""
    test_date = "2026-10-24"
    
    await record_usage(db_session, "gemini", "model-1", 1000, 500, test_date)
    await record_usage(db_session, "gemini", "model-2", 800, 400, test_date)
    await record_usage(db_session, "groq", "model-3", 600, 300, test_date)
    
    breakdown = await get_usage_by_provider(db=db_session, date_str=test_date)
    
    assert "gemini" in breakdown
    assert breakdown["gemini"]["tokens_in"] == 1800  # 1000 + 800
    assert breakdown["gemini"]["tokens_out"] == 900  # 500 + 400
    assert breakdown["gemini"]["call_count"] == 2
    
    assert "groq" in breakdown
    assert breakdown["groq"]["tokens_in"] == 600
    assert breakdown["groq"]["tokens_out"] == 300
    assert breakdown["groq"]["call_count"] == 1


# ---------------------------------------------------------------------------
# 11. Estimate page generation tokens
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_estimate_page_generation_tokens():
    """estimate_page_generation_tokens calculates conservative estimate."""
    # Default: 3000 tokens per page
    tokens_10_pages = await estimate_page_generation_tokens(10)
    assert tokens_10_pages == 30_000
    
    # Custom average
    tokens_5_pages_custom = await estimate_page_generation_tokens(5, avg_tokens_per_page=4000)
    assert tokens_5_pages_custom == 20_000


# ---------------------------------------------------------------------------
# 12. Get usage report (single day)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_usage_report_single_day(db_session):
    """get_usage_report generates report for single day."""
    test_date = "2026-10-25"
    
    await record_usage(db_session, "gemini", "model-1", 1000, 500, test_date)
    await record_usage(db_session, "groq", "model-2", 800, 400, test_date)
    
    report = await get_usage_report(
        db=db_session,
        start_date=test_date,
        end_date=test_date,
    )
    
    assert report["start_date"] == test_date
    assert report["end_date"] == test_date
    assert report["total_tokens_in"] == 1800
    assert report["total_tokens_out"] == 900
    assert report["total_tokens"] == 2700
    assert report["total_calls"] == 2
    assert len(report["daily_breakdown"]) == 1
    assert report["daily_breakdown"][0]["date"] == test_date


# ---------------------------------------------------------------------------
# 13. Get usage report (date range)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_usage_report_range(db_session):
    """get_usage_report aggregates across date range."""
    date1 = "2026-10-26"
    date2 = "2026-10-27"
    date3 = "2026-10-28"
    
    await record_usage(db_session, "gemini", "model-1", 1000, 500, date1)
    await record_usage(db_session, "gemini", "model-1", 1000, 500, date2)
    await record_usage(db_session, "gemini", "model-1", 1000, 500, date3)
    
    report = await get_usage_report(
        db=db_session,
        start_date=date1,
        end_date=date3,
    )
    
    assert report["total_tokens"] == 4500  # 3 days * 1500 tokens
    assert report["total_calls"] == 3
    assert len(report["daily_breakdown"]) == 3


# ---------------------------------------------------------------------------
# 14. Format usage report
# ---------------------------------------------------------------------------

def test_format_usage_report():
    """format_usage_report produces readable text."""
    report = {
        "start_date": "2026-10-26",
        "end_date": "2026-10-28",
        "total_tokens_in": 3000,
        "total_tokens_out": 1500,
        "total_tokens": 4500,
        "total_calls": 3,
        "daily_breakdown": [
            {"date": "2026-10-26", "tokens_in": 1000, "tokens_out": 500, "total_tokens": 1500, "call_count": 1},
            {"date": "2026-10-27", "tokens_in": 1000, "tokens_out": 500, "total_tokens": 1500, "call_count": 1},
            {"date": "2026-10-28", "tokens_in": 1000, "tokens_out": 500, "total_tokens": 1500, "call_count": 1},
        ],
    }
    
    formatted = format_usage_report(report)
    
    assert "LLM Usage Report: 2026-10-26 to 2026-10-28" in formatted
    assert "Total Calls: 3" in formatted
    assert "Total Tokens: 4,500" in formatted
    assert "2026-10-26:" in formatted
    assert "Daily Breakdown:" in formatted
