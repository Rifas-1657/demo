"""
tests/test_approval.py

Tests for page approval workflow.
"""
import pytest
import pytest_asyncio
from datetime import datetime

from app.db.models import GeneratedPage
from app.page_gen.approval import (
    ApprovalError,
    approve_page,
    can_regenerate,
    get_page_status_counts,
    get_rejection_reason,
    reject_page,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def draft_page(db_session):
    """Create a draft page for testing."""
    import random
    page_num = random.randint(100, 999)  # Unique page number per test
    page = GeneratedPage(
        course_id="python",
        chapter_number=99,  # Use test chapter
        page_number=page_num,
        cache_key=f"test_{page_num}",
        status="draft",
        content={"title": "Test Page", "narration": "Test narration"},
        version=1,
    )
    db_session.add(page)
    await db_session.commit()
    await db_session.refresh(page)
    return page


@pytest_asyncio.fixture
async def approved_page(db_session):
    """Create an approved page for testing."""
    import random
    page_num = random.randint(100, 999)  # Unique page number per test
    page = GeneratedPage(
        course_id="python",
        chapter_number=99,  # Use test chapter
        page_number=page_num,
        cache_key=f"test_{page_num}",
        status="approved",
        approved_by="user123",
        approved_at=datetime.utcnow(),
        content={"title": "Approved Page", "narration": "Test narration"},
        version=1,
    )
    db_session.add(page)
    await db_session.commit()
    await db_session.refresh(page)
    return page


# ---------------------------------------------------------------------------
# 1. Approve draft page
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_approve_draft_page(db_session, draft_page):
    """Approving a draft page sets status and metadata."""
    result = await approve_page(
        db=db_session,
        course_id=draft_page.course_id,
        chapter=draft_page.chapter_number,
        page=draft_page.page_number,
        approved_by_user_id="admin001",
    )
    
    assert result.status == "approved"
    assert result.approved_by == "admin001"
    assert result.approved_at is not None
    assert result.rejection_reason is None


# ---------------------------------------------------------------------------
# 2. Approve non-existent page fails
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_approve_nonexistent_page(db_session):
    """Approving non-existent page raises ApprovalError."""
    with pytest.raises(ApprovalError, match="Page not found"):
        await approve_page(
            db=db_session,
            course_id="python",
            chapter=99,
            page=99,
            approved_by_user_id="admin001",
        )


# ---------------------------------------------------------------------------
# 3. Approve already approved page is idempotent
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_approve_already_approved(db_session, approved_page):
    """Approving already-approved page succeeds (idempotent)."""
    result = await approve_page(
        db=db_session,
        course_id=approved_page.course_id,
        chapter=approved_page.chapter_number,
        page=approved_page.page_number,
        approved_by_user_id="admin002",
    )
    
    assert result.status == "approved"
    # Original approver preserved
    assert result.approved_by == "user123"


# ---------------------------------------------------------------------------
# 4. Reject draft page
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reject_draft_page(db_session, draft_page):
    """Rejecting a draft page sets status and reason."""
    reason = "Narration is too short, needs more detail on operators"
    
    result = await reject_page(
        db=db_session,
        course_id=draft_page.course_id,
        chapter=draft_page.chapter_number,
        page=draft_page.page_number,
        reason=reason,
        rejected_by_user_id="admin001",
    )
    
    assert result.status == "rejected"
    assert result.rejection_reason == reason
    assert result.rejected_by == "admin001"
    assert result.rejected_at is not None


# ---------------------------------------------------------------------------
# 5. Reject approved page (reverts approval)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reject_approved_page(db_session, approved_page):
    """Rejecting an approved page reverts approval."""
    reason = "Found factual error after approval"
    
    result = await reject_page(
        db=db_session,
        course_id=approved_page.course_id,
        chapter=approved_page.chapter_number,
        page=approved_page.page_number,
        reason=reason,
        rejected_by_user_id="admin002",
    )
    
    assert result.status == "rejected"
    assert result.rejection_reason == reason
    assert result.approved_by is None  # Approval cleared
    assert result.approved_at is None


# ---------------------------------------------------------------------------
# 6. Get rejection reason
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_rejection_reason(db_session, draft_page):
    """get_rejection_reason returns the stored reason."""
    await reject_page(
        db=db_session,
        course_id=draft_page.course_id,
        chapter=draft_page.chapter_number,
        page=draft_page.page_number,
        reason="Test reason",
        rejected_by_user_id="admin001",
    )
    
    reason = await get_rejection_reason(
        db=db_session,
        course_id=draft_page.course_id,
        chapter=draft_page.chapter_number,
        page=draft_page.page_number,
    )
    
    assert reason == "Test reason"


# ---------------------------------------------------------------------------
# 7. Get rejection reason for non-rejected page
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_rejection_reason_not_rejected(db_session, draft_page):
    """get_rejection_reason returns None for non-rejected page."""
    reason = await get_rejection_reason(
        db=db_session,
        course_id=draft_page.course_id,
        chapter=draft_page.chapter_number,
        page=draft_page.page_number,
    )
    
    assert reason is None


# ---------------------------------------------------------------------------
# 8. Can regenerate: no existing page
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_can_regenerate_no_page(db_session):
    """can_regenerate returns True for non-existent page."""
    can, reason = await can_regenerate(
        db=db_session,
        course_id="python",
        chapter=99,
        page=999,
    )
    
    assert can is True
    assert "No existing page" in reason


# ---------------------------------------------------------------------------
# 9. Can regenerate: draft page
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_can_regenerate_draft(db_session, draft_page):
    """can_regenerate returns True for draft page."""
    can, reason = await can_regenerate(
        db=db_session,
        course_id=draft_page.course_id,
        chapter=draft_page.chapter_number,
        page=draft_page.page_number,
    )
    
    assert can is True
    assert "draft" in reason


# ---------------------------------------------------------------------------
# 10. Cannot regenerate: approved page without force
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cannot_regenerate_approved(db_session, approved_page):
    """can_regenerate returns False for approved page without force."""
    can, reason = await can_regenerate(
        db=db_session,
        course_id=approved_page.course_id,
        chapter=approved_page.chapter_number,
        page=approved_page.page_number,
        force=False,
    )
    
    assert can is False
    assert "approved" in reason.lower()
    assert "force" in reason.lower()


# ---------------------------------------------------------------------------
# 11. Can regenerate: approved page with force
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_can_regenerate_approved_with_force(db_session, approved_page):
    """can_regenerate returns True for approved page with force=True."""
    can, reason = await can_regenerate(
        db=db_session,
        course_id=approved_page.course_id,
        chapter=approved_page.chapter_number,
        page=approved_page.page_number,
        force=True,
    )
    
    assert can is True
    assert "Force" in reason


# ---------------------------------------------------------------------------
# 12. Get page status counts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_page_status_counts(db_session):
    """get_page_status_counts returns correct counts."""
    import random
    
    # Create test pages
    draft = GeneratedPage(
        course_id="python",
        chapter_number=98,
        page_number=random.randint(100, 999),
        cache_key=f"count_test_{random.randint(1000, 9999)}",
        status="draft",
        content={},
        version=1,
    )
    approved = GeneratedPage(
        course_id="python",
        chapter_number=98,
        page_number=random.randint(100, 999),
        cache_key=f"count_test_{random.randint(1000, 9999)}",
        status="approved",
        content={},
        version=1,
    )
    rejected = GeneratedPage(
        course_id="python",
        chapter_number=98,
        page_number=random.randint(100, 999),
        cache_key=f"count_test_{random.randint(1000, 9999)}",
        status="rejected",
        rejection_reason="Test",
        content={},
        version=1,
    )
    db_session.add_all([draft, approved, rejected])
    await db_session.commit()
    
    counts = await get_page_status_counts(db=db_session, course_id="python", chapter=98)
    
    assert counts.get("draft", 0) >= 1
    assert counts.get("approved", 0) >= 1
    assert counts.get("rejected", 0) >= 1


# ---------------------------------------------------------------------------
# 13. Get page status counts filtered by chapter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_page_status_counts_filtered(db_session):
    """get_page_status_counts can filter by chapter."""
    import random
    
    # Add pages in specific chapters
    ch97 = GeneratedPage(
        course_id="python",
        chapter_number=97,
        page_number=random.randint(100, 999),
        cache_key=f"filter_test_{random.randint(1000, 9999)}",
        status="draft",
        content={},
        version=1,
    )
    ch96 = GeneratedPage(
        course_id="python",
        chapter_number=96,
        page_number=random.randint(100, 999),
        cache_key=f"filter_test_{random.randint(1000, 9999)}",
        status="draft",
        content={},
        version=1,
    )
    db_session.add_all([ch97, ch96])
    await db_session.commit()
    
    counts_ch97 = await get_page_status_counts(
        db=db_session, course_id="python", chapter=97
    )
    counts_ch96 = await get_page_status_counts(
        db=db_session, course_id="python", chapter=96
    )
    
    assert counts_ch97.get("draft", 0) >= 1
    assert counts_ch96.get("draft", 0) >= 1
