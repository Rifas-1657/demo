"""
tests/test_api.py — REST endpoint tests (B1).

Uses the `http_client` fixture from conftest (which depends on app_client,
ensuring the DB lifespan has run before any request is made).
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


async def test_health(http_client: AsyncClient):
    resp = await http_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    # B6 /health returns {"status", "service"} — no version/protocol keys


async def test_list_courses(http_client: AsyncClient):
    resp = await http_client.get("/api/courses")
    assert resp.status_code == 200
    courses = resp.json()
    assert len(courses) == 1
    assert courses[0]["id"] == "python"
