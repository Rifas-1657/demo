"""
IqraBook — Document Ingestion API
POST /api/ingest/upload → upload PDF/Word/text → chunk → embed → ChromaDB
POST /api/ingest/url    → scrape URL → chunk → embed → ChromaDB
POST /api/ingest/github → index GitHub repo files → embed → ChromaDB
GET  /api/ingest/status/{course_id} → collection stats
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingest"])

CHUNK_SIZE = 800    # chars per chunk (≈200 tokens — keep RAG context small)
CHUNK_OVERLAP = 100


# ── Pydantic Schemas ──────────────────────────────────────────────

class URLIngestRequest(BaseModel):
    url: str
    course_id: int
    topic_id: Optional[str] = None


class GitHubIngestRequest(BaseModel):
    repo_url: str          # e.g. https://github.com/user/repo
    course_id: int
    file_extensions: list[str] = [".py", ".md", ".txt"]


class IngestResponse(BaseModel):
    success: bool
    chunks_added: int
    collection_total: int
    message: str


# ── Routes ────────────────────────────────────────────────────────

@router.post("/upload", response_model=IngestResponse)
async def upload_document(
    course_id: int = Form(...),
    topic_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    """
    Upload PDF, DOCX, or TXT file and add to course RAG vectorstore.
    Owner uploads course materials → AI uses them to teach.
    """
    content_bytes = await file.read()
    filename = file.filename or "document"

    try:
        text = await _extract_text(filename, content_bytes)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file")

        chunks = _chunk_text(text)
        metadatas = [
            {"source": filename, "course_id": str(course_id), "topic_id": topic_id or "general", "chunk_idx": i}
            for i in range(len(chunks))
        ]

        from app.rag.vectorstore import ChromaManager
        manager = ChromaManager()
        await manager.add_documents(chunks, metadatas, str(course_id))

        stats = manager.get_collection_stats(str(course_id))

        return IngestResponse(
            success=True,
            chunks_added=len(chunks),
            collection_total=stats["document_count"],
            message=f"'{filename}' irundhu {len(chunks)} chunks add aaguchi! RAG ready.",
        )

    except Exception as e:
        logger.error(f"Upload ingest error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/url", response_model=IngestResponse)
async def ingest_url(req: URLIngestRequest):
    """Scrape a URL and add content to course RAG."""
    try:
        import httpx
        from bs4 import BeautifulSoup

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(req.url, headers={"User-Agent": "IqraBook/1.0"})
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        # Remove script/style tags
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text found at URL")

        chunks = _chunk_text(text)
        metadatas = [
            {"source": req.url, "course_id": str(req.course_id), "topic_id": req.topic_id or "general", "chunk_idx": i}
            for i in range(len(chunks))
        ]

        from app.rag.vectorstore import ChromaManager
        manager = ChromaManager()
        await manager.add_documents(chunks, metadatas, str(req.course_id))
        stats = manager.get_collection_stats(str(req.course_id))

        return IngestResponse(
            success=True,
            chunks_added=len(chunks),
            collection_total=stats["document_count"],
            message=f"URL irundhu {len(chunks)} chunks add aaguchi!",
        )

    except Exception as e:
        logger.error(f"URL ingest error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{course_id}")
async def ingest_status(course_id: int):
    """Get RAG collection stats for a course."""
    from app.rag.vectorstore import ChromaManager
    manager = ChromaManager()
    stats = manager.get_collection_stats(str(course_id))
    return {
        **stats,
        "ready": stats["document_count"] > 0,
        "message": (
            f"{stats['document_count']} chunks ready — RAG active!"
            if stats["document_count"] > 0
            else "No documents yet — upload course materials!"
        ),
    }


# ── Helpers ───────────────────────────────────────────────────────

async def _extract_text(filename: str, data: bytes) -> str:
    """Extract plain text from PDF, DOCX, or TXT."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "txt"

    if ext == "pdf":
        import fitz  # PyMuPDF
        doc = fitz.open(stream=data, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)

    elif ext in ("docx", "doc"):
        from docx import Document
        import io
        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    else:
        # Plain text / markdown
        return data.decode("utf-8", errors="ignore")


def _chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split text into overlapping chunks.
    Token optimization: CHUNK_SIZE=800 chars ≈ 200 tokens.
    Max 3 chunks in RAG query = max 600 tokens context.
    """
    # Clean whitespace
    text = re.sub(r"\n{3,}", "\n\n", text.strip())
    text = re.sub(r" {2,}", " ", text)

    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunk = text[start:end]

        # Try to break at sentence boundary
        if end < len(text):
            last_period = chunk.rfind(". ")
            if last_period > size // 2:
                end = start + last_period + 1
                chunk = text[start:end]

        chunk = chunk.strip()
        if chunk:
            chunks.append(chunk)

        start = end - overlap

    return chunks
