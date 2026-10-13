"""
app/api/routes.py — Legacy B0 REST endpoints (kept for backwards compat).

B1 note: These routes delegate to the DB-backed endpoints in app/api/courses.py.
The health endpoint is updated to reflect B1.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "B1"
    protocol: int = 2


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()
