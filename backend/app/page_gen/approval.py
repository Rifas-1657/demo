"""
app/page_gen/approval.py

Approval workflow for generated pages.

States:
  draft     → approved (publishable)
  draft     → rejected (with reason, fed back to next generation)
  approved  → archived (on new version or rollback)
  rejected  → draft (regenerated with feedback)
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GeneratedPage

log = logging.getLogger(__name__)


class ApprovalError(Exception):
    """Raised when approval workflow operation fails."""
    pass


async def approve_page(
    db: AsyncSession,
    course_id: str,
    chapter: int,
    page: int,
    approved_by_user_id: str,
) -> GeneratedPage:
    """
    Approve a draft page, making it publishable.
    
    Args:
        db: Database session
        course_id: Course ID
        chapter: Chapter number
        page: Page number
        approved_by_user_id: User ID of approver
    
    Returns:
        Updated GeneratedPage
    
    Raises:
        ApprovalError: If page not found, not in draft status, or already approved
    """
    result = await db.execute(
        select(GeneratedPage).where(
            GeneratedPage.course_id == course_id,
            GeneratedPage.chapter_number == chapter,
            GeneratedPage.page_number == page,
        ).order_by(GeneratedPage.version.desc())
    )
    page_record = result.scalar_one_or_none()
    
    if not page_record:
        raise ApprovalError(f"Page not found: {course_id} ch{chapter} p{page}")
    
    if page_record.status == "approved":
        log.info("Page already approved: %s ch%d p%d", course_id, chapter, page)
        return page_record
    
    if page_record.status not in ("draft", "rejected"):
        raise ApprovalError(
            f"Cannot approve page in status '{page_record.status}'. "
            f"Only draft or rejected pages can be approved."
        )
    
    # Approve
    page_record.status = "approved"
    page_record.approved_by = approved_by_user_id
    page_record.approved_at = datetime.utcnow()
    page_record.rejection_reason = None  # Clear any previous rejection
    page_record.rejected_by = None
    page_record.rejected_at = None
    
    await db.commit()
    await db.refresh(page_record)
    
    log.info(
        "Page approved: %s ch%d p%d by user %s",
        course_id, chapter, page, approved_by_user_id
    )
    
    return page_record


async def reject_page(
    db: AsyncSession,
    course_id: str,
    chapter: int,
    page: int,
    reason: str,
    rejected_by_user_id: str,
) -> GeneratedPage:
    """
    Reject a draft page with a reason.
    The reason will be fed back to the next generation attempt.
    
    Args:
        db: Database session
        course_id: Course ID
        chapter: Chapter number
        page: Page number
        reason: Rejection reason (fed to next generation)
        rejected_by_user_id: User ID of reviewer
    
    Returns:
        Updated GeneratedPage
    
    Raises:
        ApprovalError: If page not found or not rejectable
    """
    result = await db.execute(
        select(GeneratedPage).where(
            GeneratedPage.course_id == course_id,
            GeneratedPage.chapter_number == chapter,
            GeneratedPage.page_number == page,
        ).order_by(GeneratedPage.version.desc())
    )
    page_record = result.scalar_one_or_none()
    
    if not page_record:
        raise ApprovalError(f"Page not found: {course_id} ch{chapter} p{page}")
    
    if page_record.status not in ("draft", "approved"):
        raise ApprovalError(
            f"Cannot reject page in status '{page_record.status}'. "
            f"Only draft or approved pages can be rejected."
        )
    
    # Reject
    page_record.status = "rejected"
    page_record.rejection_reason = reason
    page_record.rejected_by = rejected_by_user_id
    page_record.rejected_at = datetime.utcnow()
    
    # Clear approval if previously approved
    if page_record.approved_by:
        log.info(
            "Reversing previous approval of %s ch%d p%d",
            course_id, chapter, page
        )
        page_record.approved_by = None
        page_record.approved_at = None
    
    await db.commit()
    await db.refresh(page_record)
    
    log.info(
        "Page rejected: %s ch%d p%d by user %s, reason: %s",
        course_id, chapter, page, rejected_by_user_id, reason[:100]
    )
    
    return page_record


async def get_rejection_reason(
    db: AsyncSession,
    course_id: str,
    chapter: int,
    page: int,
) -> str | None:
    """
    Get the rejection reason for a page if it was rejected.
    Used to provide feedback to the next generation attempt.
    
    Returns None if page was never rejected or rejection reason is empty.
    """
    result = await db.execute(
        select(GeneratedPage).where(
            GeneratedPage.course_id == course_id,
            GeneratedPage.chapter_number == chapter,
            GeneratedPage.page_number == page,
        ).order_by(GeneratedPage.version.desc())
    )
    page_record = result.scalar_one_or_none()
    
    if not page_record:
        return None
    
    return page_record.rejection_reason if page_record.rejection_reason else None


async def can_regenerate(
    db: AsyncSession,
    course_id: str,
    chapter: int,
    page: int,
    force: bool = False,
) -> Tuple[bool, str]:
    """
    Check if a page can be regenerated.
    
    Args:
        db: Database session
        course_id: Course ID
        chapter: Chapter number
        page: Page number
        force: If True, allow regenerating even approved pages
    
    Returns:
        (can_regenerate: bool, reason: str)
    """
    result = await db.execute(
        select(GeneratedPage).where(
            GeneratedPage.course_id == course_id,
            GeneratedPage.chapter_number == chapter,
            GeneratedPage.page_number == page,
        ).order_by(GeneratedPage.version.desc())
    )
    page_record = result.scalar_one_or_none()
    
    # No existing page → can generate
    if not page_record:
        return True, "No existing page"
    
    # Force flag → can regenerate
    if force:
        return True, "Force flag set"
    
    # Approved page → cannot regenerate without force
    if page_record.status == "approved":
        return False, "Page is approved (use --force to regenerate)"
    
    # Draft or rejected → can regenerate
    if page_record.status in ("draft", "rejected"):
        return True, f"Page is {page_record.status}"
    
    # Other statuses → can regenerate
    return True, f"Page status: {page_record.status}"


async def archive_old_version(
    db: AsyncSession,
    page_record: GeneratedPage,
) -> None:
    """
    Archive an old version before creating a new one.
    Sets status to "archived" and stores link to new version.
    """
    page_record.status = "archived"
    await db.commit()
    log.info(
        "Archived version %d of %s ch%d p%d",
        page_record.version,
        page_record.course_id,
        page_record.chapter_number,
        page_record.page_number,
    )


async def get_page_status_counts(
    db: AsyncSession,
    course_id: str = "python",
    chapter: int | None = None,
) -> dict[str, int]:
    """
    Count pages by status for reporting.
    
    Returns dict: {status: count}
    Example: {"draft": 5, "approved": 10, "rejected": 2}
    """
    from sqlalchemy import func
    
    query = select(
        GeneratedPage.status,
        func.count(GeneratedPage.id).label("count")
    ).where(
        GeneratedPage.course_id == course_id
    ).group_by(GeneratedPage.status)
    
    if chapter is not None:
        query = query.where(GeneratedPage.chapter_number == chapter)
    
    result = await db.execute(query)
    rows = result.all()
    
    return {row.status: row.count for row in rows}
