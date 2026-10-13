"""
tests/test_rest_payloads.py — Item 6: REST payload shape verification.

Tests the actual request/response shapes for notes, bookmarks, progress,
profile and history endpoints against the running backend.

Key mismatch being verified:
  - POST /me/notes expects snake_case body fields: course_id, chapter_number, page_id
  - POST /me/bookmarks expects snake_case body fields: course_id, chapter_number, page_id
  - Responses use snake_case: course_id, chapter_number, page_id, created_at, updated_at

The TypeScript client (lib/api/client.ts) was originally sending camelCase fields
(courseId, chapter, page, createdAt) which would fail silently with 422 or
be ignored by Pydantic defaults. This test suite documents the actual backend
contract (snake_case throughout) and must remain passing.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Notes endpoints
# ---------------------------------------------------------------------------

async def test_create_note_snake_case(auth_http_client: AsyncClient):
    """POST /me/notes with snake_case body succeeds and returns snake_case response."""
    resp = await auth_http_client.post(
        "/me/notes",
        json={
            "course_id": "python",
            "chapter_number": 1,
            "page_id": "lesson_python_1_1",
            "text": "Test note for REST payload test",
        },
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    # Response must contain snake_case fields
    assert "id" in data
    assert data["course_id"] == "python"
    assert data["chapter_number"] == 1
    assert data["page_id"] == "lesson_python_1_1"
    assert data["text"] == "Test note for REST payload test"
    assert "created_at" in data
    assert "updated_at" in data
    return data["id"]


async def test_create_note_camelcase_fails(auth_http_client: AsyncClient):
    """POST /me/notes with camelCase body fails validation (422)."""
    resp = await auth_http_client.post(
        "/me/notes",
        json={
            "courseId": "python",   # camelCase — wrong
            "chapter": 1,           # camelCase — wrong
            "page": "lesson_python_1_1",  # camelCase — wrong
            "text": "This should fail",
        },
    )
    # Pydantic rejects missing required fields (course_id, chapter_number, page_id)
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"


async def test_list_notes_returns_snake_case(auth_http_client: AsyncClient):
    """GET /me/notes returns list with snake_case fields."""
    # Create a note first
    await auth_http_client.post(
        "/me/notes",
        json={
            "course_id": "python",
            "chapter_number": 1,
            "page_id": "lesson_python_1_1",
            "text": "Note for list test",
        },
    )
    resp = await auth_http_client.get("/me/notes")
    assert resp.status_code == 200
    notes = resp.json()
    assert isinstance(notes, list)
    if notes:
        note = notes[0]
        assert "course_id" in note
        assert "chapter_number" in note
        assert "page_id" in note
        assert "created_at" in note
        assert "updated_at" in note
        # Must NOT have camelCase fields
        assert "courseId" not in note
        assert "chapterNumber" not in note
        assert "pageId" not in note
        assert "createdAt" not in note
        assert "updatedAt" not in note


async def test_update_note_snake_case(auth_http_client: AsyncClient):
    """PATCH /me/notes/{id} with snake_case body works correctly."""
    # Create a note
    create_resp = await auth_http_client.post(
        "/me/notes",
        json={
            "course_id": "python",
            "chapter_number": 1,
            "page_id": "lesson_python_1_1",
            "text": "Original text",
        },
    )
    assert create_resp.status_code == 201
    note_id = create_resp.json()["id"]

    # Update it
    patch_resp = await auth_http_client.patch(
        f"/me/notes/{note_id}",
        json={"text": "Updated text"},
    )
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["text"] == "Updated text"
    assert "course_id" in data
    assert "updated_at" in data


async def test_delete_note(auth_http_client: AsyncClient):
    """DELETE /me/notes/{id} returns 204."""
    create_resp = await auth_http_client.post(
        "/me/notes",
        json={
            "course_id": "python",
            "chapter_number": 1,
            "page_id": "lesson_python_1_1",
            "text": "Note to delete",
        },
    )
    assert create_resp.status_code == 201
    note_id = create_resp.json()["id"]

    del_resp = await auth_http_client.delete(f"/me/notes/{note_id}")
    assert del_resp.status_code == 204


async def test_note_requires_auth(http_client: AsyncClient):
    """Notes endpoints require authentication."""
    resp = await http_client.get("/me/notes")
    assert resp.status_code == 401

    resp2 = await http_client.post(
        "/me/notes",
        json={"course_id": "python", "chapter_number": 1, "page_id": "p1", "text": "x"},
    )
    assert resp2.status_code == 401


async def test_note_missing_field_fails(auth_http_client: AsyncClient):
    """POST /me/notes with missing required field returns 422."""
    resp = await auth_http_client.post(
        "/me/notes",
        json={
            "course_id": "python",
            "chapter_number": 1,
            # missing page_id and text → should fail
        },
    )
    assert resp.status_code == 422


async def test_delete_nonexistent_note_returns_404(auth_http_client: AsyncClient):
    """DELETE /me/notes/{non-existent-id} returns 404."""
    resp = await auth_http_client.delete("/me/notes/nonexistent-note-id-xyz")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Bookmarks endpoints
# ---------------------------------------------------------------------------

async def test_create_bookmark_snake_case(auth_http_client: AsyncClient):
    """POST /me/bookmarks with snake_case body succeeds and returns snake_case response."""
    resp = await auth_http_client.post(
        "/me/bookmarks",
        json={
            "course_id": "python",
            "chapter_number": 1,
            "page_id": "lesson_python_1_1",
            "excerpt": "Test excerpt for bookmark test",
        },
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "id" in data
    assert data["course_id"] == "python"
    assert data["chapter_number"] == 1
    assert data["page_id"] == "lesson_python_1_1"
    assert data["excerpt"] == "Test excerpt for bookmark test"
    assert "created_at" in data
    # Must NOT have camelCase fields
    assert "courseId" not in data
    assert "createdAt" not in data


async def test_create_bookmark_camelcase_fails(auth_http_client: AsyncClient):
    """POST /me/bookmarks with camelCase body fails validation (422)."""
    resp = await auth_http_client.post(
        "/me/bookmarks",
        json={
            "courseId": "python",   # camelCase — wrong
            "chapter": 1,           # camelCase — wrong
            "page": "lesson_python_1_1",  # camelCase — wrong
            "excerpt": "This should fail",
        },
    )
    # Pydantic rejects missing required fields
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.text}"


async def test_list_bookmarks_returns_snake_case(auth_http_client: AsyncClient):
    """GET /me/bookmarks returns list with snake_case fields."""
    await auth_http_client.post(
        "/me/bookmarks",
        json={
            "course_id": "python",
            "chapter_number": 1,
            "page_id": "lesson_python_1_1",
            "excerpt": "Excerpt for list test",
        },
    )
    resp = await auth_http_client.get("/me/bookmarks")
    assert resp.status_code == 200
    bookmarks = resp.json()
    assert isinstance(bookmarks, list)
    if bookmarks:
        bm = bookmarks[0]
        assert "course_id" in bm
        assert "chapter_number" in bm
        assert "page_id" in bm
        assert "created_at" in bm
        # Must NOT have camelCase
        assert "courseId" not in bm
        assert "chapterNumber" not in bm
        assert "pageId" not in bm
        assert "createdAt" not in bm


async def test_delete_bookmark(auth_http_client: AsyncClient):
    """DELETE /me/bookmarks/{id} returns 204."""
    create_resp = await auth_http_client.post(
        "/me/bookmarks",
        json={
            "course_id": "python",
            "chapter_number": 1,
            "page_id": "lesson_python_1_1",
            "excerpt": "Bookmark to delete",
        },
    )
    assert create_resp.status_code == 201
    bm_id = create_resp.json()["id"]

    del_resp = await auth_http_client.delete(f"/me/bookmarks/{bm_id}")
    assert del_resp.status_code == 204


async def test_bookmark_requires_auth(http_client: AsyncClient):
    """Bookmark endpoints require authentication."""
    resp = await http_client.get("/me/bookmarks")
    assert resp.status_code == 401

    resp2 = await http_client.post(
        "/me/bookmarks",
        json={"course_id": "python", "chapter_number": 1, "page_id": "p1", "excerpt": "x"},
    )
    assert resp2.status_code == 401


async def test_delete_nonexistent_bookmark_returns_404(auth_http_client: AsyncClient):
    """DELETE /me/bookmarks/{non-existent-id} returns 404."""
    resp = await auth_http_client.delete("/me/bookmarks/nonexistent-bm-id-xyz")
    assert resp.status_code == 404


async def test_bookmark_with_empty_excerpt(auth_http_client: AsyncClient):
    """POST /me/bookmarks with empty excerpt uses default empty string."""
    resp = await auth_http_client.post(
        "/me/bookmarks",
        json={
            "course_id": "python",
            "chapter_number": 1,
            "page_id": "lesson_python_1_1",
            # excerpt omitted — uses default ""
        },
    )
    assert resp.status_code == 201
    assert resp.json()["excerpt"] == ""


# ---------------------------------------------------------------------------
# Progress endpoints
# ---------------------------------------------------------------------------

async def test_progress_list_snake_case(auth_http_client: AsyncClient):
    """GET /me/progress returns list with snake_case fields."""
    resp = await auth_http_client.get("/me/progress")
    assert resp.status_code == 200
    progress = resp.json()
    assert isinstance(progress, list)
    if progress:
        p = progress[0]
        assert "course_id" in p
        assert "completed_pages" in p
        assert "total_pages" in p
        # Must NOT have camelCase
        assert "courseId" not in p
        assert "completedPages" not in p


async def test_progress_by_course_snake_case(auth_http_client: AsyncClient):
    """GET /me/progress/{course_id} returns list with snake_case fields."""
    resp = await auth_http_client.get("/me/progress/python")
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    if items:
        item = items[0]
        assert "course_id" in item
        assert "page_id" in item
        assert "completed" in item
        assert "last_word_index" in item
        # Must NOT have camelCase
        assert "courseId" not in item
        assert "pageId" not in item


async def test_mark_page_complete_snake_case(auth_http_client: AsyncClient):
    """POST /me/progress/{course_id}/{page_id}/complete returns snake_case response."""
    resp = await auth_http_client.post(
        "/me/progress/python/lesson_python_1_1/complete"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "page_id" in data
    assert data["page_id"] == "lesson_python_1_1"
    assert data["completed"] is True


async def test_progress_requires_auth(http_client: AsyncClient):
    """Progress endpoints require authentication."""
    resp = await http_client.get("/me/progress")
    assert resp.status_code == 401

    resp2 = await http_client.post("/me/progress/python/lesson_python_1_1/complete")
    assert resp2.status_code == 401


# ---------------------------------------------------------------------------
# Profile endpoint
# ---------------------------------------------------------------------------

async def test_profile_snake_case(auth_http_client: AsyncClient):
    """GET /me returns profile with snake_case fields."""
    resp = await auth_http_client.get("/me")
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert "email" in data
    assert "display_name" in data
    assert "role" in data
    assert "created_at" in data
    # Must NOT have camelCase
    assert "displayName" not in data
    assert "createdAt" not in data


async def test_profile_requires_auth(http_client: AsyncClient):
    """GET /me requires authentication."""
    resp = await http_client.get("/me")
    assert resp.status_code == 401


async def test_profile_update_snake_case(auth_http_client: AsyncClient):
    """PATCH /me with snake_case body updates profile."""
    resp = await auth_http_client.patch(
        "/me",
        json={"display_name": "Updated Test Name"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_name"] == "Updated Test Name"


# ---------------------------------------------------------------------------
# History endpoint
# ---------------------------------------------------------------------------

async def test_history_requires_auth(http_client: AsyncClient):
    """GET /me/history requires authentication."""
    resp = await http_client.get("/me/history")
    assert resp.status_code == 401


async def test_history_snake_case(auth_http_client: AsyncClient):
    """GET /me/history returns snake_case fields."""
    resp = await auth_http_client.get("/me/history")
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    if items:
        item = items[0]
        assert "course_id" in item
        assert "page_id" in item
        assert "visited_at" in item
        assert "courseId" not in item
        assert "pageId" not in item
        assert "visitedAt" not in item
