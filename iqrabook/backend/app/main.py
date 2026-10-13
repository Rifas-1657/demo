"""
IqraBook — FastAPI main with ALL routers
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.db.database import create_tables
from app.api.routes import course, session, survey, streaming, ingest, rl_feedback, roadmap

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 IqraBook starting — بِسْمِ ٱللَّٰهِ")
    await create_tables()
    logger.info("✅ Database tables ready")
    yield
    logger.info("👋 IqraBook shutting down")


app = FastAPI(
    title="IqraBook API",
    description="AI-Powered 3D Interactive Learning Platform — اقرأ",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://iqrabook.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── All Routers ────────────────────────────────────────────────────
app.include_router(course.router,       prefix="/api")
app.include_router(session.router,      prefix="/api")
app.include_router(survey.router,       prefix="/api")
app.include_router(ingest.router,       prefix="/api")
app.include_router(rl_feedback.router,  prefix="/api")
app.include_router(roadmap.router,      prefix="/api")
app.include_router(streaming.router)    # WebSocket — no /api prefix


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "name": "IqraBook",
        "version": "1.0.0",
        "message": "اقْرَأْ — Read!",
        "endpoints": {
            "courses":  "/api/courses",
            "sessions": "/api/sessions",
            "survey":   "/api/survey",
            "ingest":   "/api/ingest/upload",
            "rl":       "/api/rl/action/{session_id}",
            "ws":       "/ws/chat/{session_id}",
            "docs":     "/docs",
        },
    }


@app.get("/")
async def root():
    return {"message": "IqraBook API — بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"}
