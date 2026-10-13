"""
IqraBook — Content ingestion route for owners
POST /api/ingest/roadmap → AI generates course roadmap from owner-uploaded docs
GET  /api/ingest/roadmap/{course_id} → get generated roadmap
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/roadmap", tags=["roadmap"])


class RoadmapRequest(BaseModel):
    course_id: int
    course_title: str
    owner_notes: Optional[str] = None   # Extra instructions from owner


class RoadmapTopic(BaseModel):
    id: str
    title: str
    estimated_mins: int
    order: int
    subtopics: list[str]


class RoadmapResponse(BaseModel):
    course_id: int
    topics: list[RoadmapTopic]
    total_topics: int
    message: str


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(req: RoadmapRequest):
    """
    Generate a course roadmap from ingested RAG documents using Gemini.
    Owner uploads docs first → then calls this → AI creates structured roadmap.
    Token cost: ~1000 tokens per generation (one-time, not per-session).
    """
    from app.core.gemini_client import GeminiClient
    from app.core.config import settings
    from app.rag.vectorstore import ChromaManager

    gemini = GeminiClient(settings.GEMINI_API_KEY)
    chroma = ChromaManager()

    # Get existing chunks to understand course content
    stats = chroma.get_collection_stats(str(req.course_id))
    context = ""
    if stats["document_count"] > 0:
        chunks = await chroma.similarity_search(
            query=f"{req.course_title} syllabus topics overview",
            course_id=str(req.course_id),
            top_k=3,
        )
        context = "\n".join(chunks)

    system = (
        "You are IqraBook's curriculum designer. "
        "Generate a structured JSON course roadmap. "
        "Output ONLY valid JSON array. No explanation."
    )

    notes_part = f"\nOwner notes: {req.owner_notes}" if req.owner_notes else ""
    context_part = f"\nCourse documents:\n{context[:600]}" if context else ""

    prompt = (
        f"Create a complete roadmap for: {req.course_title}{notes_part}{context_part}\n\n"
        "Return JSON array of topics:\n"
        '[{"id":"t_01","title":"Topic Name","estimated_mins":20,"order":1,"subtopics":["sub1","sub2"]},...]\n'
        "Include 15-25 topics. Make it comprehensive and practical."
    )

    try:
        chunks_gen = []
        async for chunk in gemini.generate_text_stream(prompt, system):
            chunks_gen.append(chunk)
        raw = "".join(chunks_gen)

        # Extract JSON array
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start < 0 or end <= start:
            raise ValueError("No JSON array in response")

        topics_data = json.loads(raw[start:end])
        topics = [RoadmapTopic(**t) for t in topics_data]

        return RoadmapResponse(
            course_id=req.course_id,
            topics=topics,
            total_topics=len(topics),
            message=f"{len(topics)} topics generate aaguchi! Course ready to teach!",
        )

    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {e}")
