"""
tests/test_admin_approval_api.py

Tests for admin approval/rejection API endpoints.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GeneratedPage


@pytest.fixture
async def draft_page(db_session: AsyncSession):
    """Create a draft page for testing."""
    import random
    page_num = random.randint(500, 999)
    page = GeneratedPage(
        course_id="python",
        chapter_number=98,
        page_number=page_num,
        cache_key=f"python_98_{page_num}_v1_test_{random.randint(1000, 9999)}",
        status="draft",
        version=1,
        content={"narration": "Test content"},
    )
    db_session.add(page)
    await db_session.commit()
    await db_session.refresh(page)
    return page


@pytest.mark.asyncio
async def test_approve_draft_page(
    admin_http_client,
    draft_page: GeneratedPage,
    db_session: AsyncSession,
):
    """Test approving a draft page."""
    response = await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/approve",
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"
    assert data["page"] == draft_page.page_number
    assert data["approved_by"] is not None
    assert data["approved_at"] is not None
    
    # Verify in database
    await db_session.refresh(draft_page)
    assert draft_page.status == "approved"
    assert draft_page.approved_by is not None
    assert draft_page.approved_at is not None


@pytest.mark.asyncio
async def test_approve_nonexistent_page(
    admin_http_client,
):
    """Test approving a non-existent page returns 400."""
    response = await admin_http_client.post(
        "/api/admin/pages/python/99/999/approve",
    )
    
    assert response.status_code == 400
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_approve_already_approved_page(
    admin_http_client,
    draft_page: GeneratedPage,
    db_session: AsyncSession,
):
    """Test approving an already approved page is idempotent."""
    # First approval
    await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/approve",
    )
    
    # Second approval
    response = await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/approve",
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"


@pytest.mark.asyncio
async def test_reject_draft_page(
    admin_http_client,
    draft_page: GeneratedPage,
    db_session: AsyncSession,
):
    """Test rejecting a draft page with reason."""
    rejection_reason = "The analogies are not culturally relevant. Need more cricket examples."
    
    response = await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/reject",
        json={"reason": rejection_reason},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"
    assert data["page"] == draft_page.page_number
    assert data["rejection_reason"] == rejection_reason
    assert data["rejected_by"] is not None
    assert data["rejected_at"] is not None
    
    # Verify in database
    await db_session.refresh(draft_page)
    assert draft_page.status == "rejected"
    assert draft_page.rejection_reason == rejection_reason
    assert draft_page.rejected_by is not None
    assert draft_page.rejected_at is not None


@pytest.mark.asyncio
async def test_reject_without_reason(
    admin_http_client,
    draft_page: GeneratedPage,
):
    """Test rejecting without a reason fails."""
    response = await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/reject",
        json={"reason": ""},
    )
    
    assert response.status_code == 400
    assert "at least 10 characters" in response.json()["detail"]


@pytest.mark.asyncio
async def test_reject_with_short_reason(
    admin_http_client,
    draft_page: GeneratedPage,
):
    """Test rejecting with too short reason fails."""
    response = await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/reject",
        json={"reason": "bad"},
    )
    
    assert response.status_code == 400
    assert "at least 10 characters" in response.json()["detail"]


@pytest.mark.asyncio
async def test_reject_approved_page(
    admin_http_client,
    draft_page: GeneratedPage,
    db_session: AsyncSession,
):
    """Test rejecting an approved page (reverses approval)."""
    # First approve
    await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/approve",
    )
    
    # Then reject
    rejection_reason = "Found a technical error after approval."
    response = await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/reject",
        json={"reason": rejection_reason},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"
    
    # Verify approval was cleared
    await db_session.refresh(draft_page)
    assert draft_page.status == "rejected"
    assert draft_page.approved_by is None
    assert draft_page.approved_at is None
    assert draft_page.rejection_reason == rejection_reason


@pytest.mark.asyncio
async def test_approve_rejected_page(
    admin_http_client,
    draft_page: GeneratedPage,
    db_session: AsyncSession,
):
    """Test approving a rejected page (clears rejection)."""
    # First reject
    await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/reject",
        json={"reason": "Needs improvements."},
    )
    
    # Then approve
    response = await admin_http_client.post(
        f"/api/admin/pages/{draft_page.course_id}/{draft_page.chapter_number}/{draft_page.page_number}/approve",
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"
    
    # Verify rejection was cleared
    await db_session.refresh(draft_page)
    assert draft_page.status == "approved"
    assert draft_page.rejection_reason is None
    assert draft_page.rejected_by is None
    assert draft_page.rejected_at is None
