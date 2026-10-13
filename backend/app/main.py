"""
app/main.py — FastAPI application entry point (B6).
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.db.database import AsyncSessionLocal, engine
from app.db.models import Base
from app.db.seed import seed_database
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limit import limiter
from app.middleware.security import SecurityHeadersMiddleware
from app.ws.gateway import book_ws_handler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Lifespan: create tables + seed on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting Bookey backend B1 (%s)", settings.app_env)

    # Create all tables (no-op if they exist)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create FTS5 virtual table for search (SQLite only)
    if "sqlite" in settings.database_url:
        async with engine.begin() as conn:
            await conn.execute(
                __import__("sqlalchemy", fromlist=["text"]).text("""
                    CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts
                    USING fts5(title, narration_text, content='pages', content_rowid='rowid')
                """)
            )
            # Populate / sync FTS index
            await conn.execute(__import__("sqlalchemy", fromlist=["text"]).text(
                "INSERT OR IGNORE INTO pages_fts(rowid, title, narration_text) "
                "SELECT rowid, title, narration_text FROM pages"
            ))

    # Seed the database with Python course data + admin user
    async with AsyncSessionLocal() as session:
        await seed_database(session)

    log.info("Database ready")
    yield
    log.info("Shutting down - draining open WebSocket connections")
    # Signal all open WS connections to close gracefully
    import asyncio
    for ws in list(_open_ws):
        try:
            await ws.close(1001, "Server shutting down")
        except Exception:
            pass
    if _open_ws:
        await asyncio.sleep(0.5)  # brief drain window
    await engine.dispose()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

# Graceful WS shutdown tracking
_open_ws: set[WebSocket] = set()

app = FastAPI(
    title="Bookey Backend B6",
    description="Adaptive interactive book reader — B0 through B6.",
    version="0.6.0-B6",
    lifespan=lifespan,
    openapi_url="/openapi.json" if settings.app_env != "production" else None,
)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Request logging with request IDs
app.add_middleware(RequestLoggingMiddleware)

# CORS (must come after custom middleware in Starlette ordering)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

# Auth
from app.auth.router import router as auth_router
app.include_router(auth_router)

# B1 REST endpoints
from app.api.ws_ticket import router as ws_ticket_router
from app.api.courses import router as courses_router
from app.api.progress import router as progress_router
from app.api.bookmarks import router as bookmarks_router
from app.api.notes import router as notes_router
from app.api.profile import router as profile_router
from app.api.history import router as history_router
from app.api.notifications import router as notifications_router
from app.api.search import router as search_router
from app.api.admin.members import router as admin_members_router
from app.api.admin.courses import router as admin_courses_router
from app.api.admin.tutor import router as admin_tutor_router
from app.api.admin.documents import router as admin_documents_router
from app.api.admin.pages import router as admin_pages_router

app.include_router(ws_ticket_router)
app.include_router(courses_router)
app.include_router(progress_router)
app.include_router(bookmarks_router)
app.include_router(notes_router)
app.include_router(profile_router)
app.include_router(history_router)
app.include_router(notifications_router)
app.include_router(search_router)
app.include_router(admin_members_router)
app.include_router(admin_courses_router)
app.include_router(admin_tutor_router)
app.include_router(admin_documents_router)
app.include_router(admin_pages_router)

# B6: Personalization (bandit + FSRS)
from app.api.personalization import router as personalization_router
app.include_router(personalization_router)

# B6: Observability (/health, /ready, metrics)
from app.observability import register_observability
register_observability(app)

# B6: Provider metrics endpoint
from fastapi import APIRouter as _APIRouter
from app.auth.dependencies import require_admin as _require_admin

_obs_router = _APIRouter(prefix="/api/admin", tags=["observability"])

@_obs_router.get("/metrics/providers")
async def provider_metrics_endpoint(admin=__import__('fastapi').Depends(_require_admin)):
    from app.observability import provider_summary, get_provider_metrics
    return {"summary": provider_summary(), "recent": get_provider_metrics(50)}

app.include_router(_obs_router)

# Legacy B0 health + course/page routes (kept for backwards compat)
from app.api.routes import router as legacy_router
app.include_router(legacy_router)


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

@app.websocket("/ws/book")
async def ws_book(websocket: WebSocket) -> None:
    _open_ws.add(websocket)
    try:
        await book_ws_handler(websocket)
    finally:
        _open_ws.discard(websocket)
