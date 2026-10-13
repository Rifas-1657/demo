"""
app/page_gen/pipeline.py

Page generation pipeline.

Flow per page:
  1. Course validation (Python only for now)
  2. KB retrieval (B2 RetrievalEngine)
  3. LLM generate_json → parse GeneratedPage
  4. Verify (schema + code sandbox + narration length + cue targets)
  5. If errors → repair (max 2 retries, using repair prompt)
  6. If still invalid → raise GenerationError with details
  7. Store in DB (generated_pages table) + record attempt in page_gen_logs

Cache keyed by (course_id, chapter, page, personalization_hash, content_version).
Regenerate flag bypasses cache.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import uuid
from datetime import datetime

from pydantic import ValidationError

from app.config import get_settings
from app.llm.router import LLMError, get_llm_router
from app.page_gen.prompts import build_page_prompt, build_repair_prompt, build_system
from app.page_gen.schema import GeneratedPage
from app.page_gen.verifier import verify_page

log = logging.getLogger(__name__)

SUPPORTED_COURSES = {"python"}
MAX_REPAIR_ATTEMPTS = 2


class GenerationError(Exception):
    def __init__(self, message: str, attempts: list[dict] | None = None) -> None:
        super().__init__(message)
        self.attempts = attempts or []


async def generate_page(
    course_id: str,
    chapter: int,
    page: int,
    chapter_topic: str = "",
    page_topic: str = "",
    personalization_hash: str = "",
    content_version: str = "v1",
    regenerate: bool = False,
    llm_router=None,
) -> GeneratedPage:
    """
    Generate (or return cached) a page for the given coordinates.

    Args:
        course_id: Must be in SUPPORTED_COURSES
        chapter / page: 1-based coordinates
        chapter_topic: human description of the chapter
        page_topic: human description of this page
        personalization_hash: hash of learner prefs (empty = no personalization)
        content_version: bumped to invalidate all existing cache entries
        regenerate: bypass cache and force regeneration
        llm_router: override for tests (pass MockLLMProvider-backed router)
    """
    if course_id.lower() not in SUPPORTED_COURSES:
        raise GenerationError(
            f"Course '{course_id}' is not supported in B3. "
            f"Currently only Python courses are generated. "
            f"Non-Python topics will be supported in a future sprint."
        )

    s = get_settings()
    cache_key = _cache_key(course_id, chapter, page, personalization_hash, content_version)

    # ------- Cache lookup -------
    if not regenerate:
        cached = await _cache_get(cache_key)
        if cached:
            log.info("Page cache HIT: %s ch%d p%d", course_id, chapter, page)
            return cached

    log.info("Generating page: %s ch%d p%d (regen=%s)", course_id, chapter, page, regenerate)

    # ------- KB retrieval -------
    kb_text = await _retrieve_kb_passages(course_id, page_topic or chapter_topic)

    # ------- LLM generation + repair loop -------
    router = llm_router or get_llm_router()
    system = build_system(s.page_min_words, s.page_max_words)
    prompt = build_page_prompt(
        course_id=course_id,
        chapter=chapter,
        page=page,
        chapter_topic=chapter_topic or f"Chapter {chapter}",
        page_topic=page_topic or f"Page {page}",
        kb_passages=kb_text,
        min_words=s.page_min_words,
        max_words=s.page_max_words,
    )

    attempts: list[dict] = []
    current_prompt = prompt
    current_json: str = ""
    generated: GeneratedPage | None = None

    for attempt_num in range(MAX_REPAIR_ATTEMPTS + 1):
        # Generate
        try:
            resp = await router.generate_json(
                prompt=current_prompt,
                schema={},
                system=system,
                temperature=0.3 if attempt_num == 0 else 0.1,
                max_tokens=s.page_max_tokens,
            )
            current_json = resp.text
        except LLMError as exc:
            attempts.append({"attempt": attempt_num, "error": str(exc), "phase": "llm"})
            raise GenerationError(f"LLM failed: {exc}", attempts=attempts) from exc

        # Parse
        parse_errors: list[str] = []
        try:
            data = json.loads(_strip_fences(current_json))
            # Inject identity fields
            data.setdefault("course_id", course_id)
            data.setdefault("chapter", chapter)
            data.setdefault("page", page)
            data.setdefault("content_version", content_version)
            data.setdefault("personalization_hash", personalization_hash)
            candidate = GeneratedPage.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            parse_errors = [str(exc)]
            attempts.append({"attempt": attempt_num, "errors": parse_errors, "phase": "parse"})
            if attempt_num < MAX_REPAIR_ATTEMPTS:
                current_prompt = build_repair_prompt(current_json, parse_errors)
                continue
            raise GenerationError(
                f"Page JSON invalid after {attempt_num + 1} attempts: {parse_errors}",
                attempts=attempts,
            )

        # Verify
        vr = await verify_page(candidate)
        attempt_record = {
            "attempt": attempt_num,
            "errors": vr.errors,
            "warnings": vr.warnings,
            "sandbox_unavailable": vr.sandbox_unavailable,
            "phase": "verify",
            "provider": resp.provider,
            "model": resp.model,
            "latency_ms": resp.latency_ms,
        }
        attempts.append(attempt_record)

        if vr.is_valid:
            candidate.verified = not vr.sandbox_unavailable
            candidate.verification_errors = vr.warnings
            generated = candidate
            break

        if attempt_num < MAX_REPAIR_ATTEMPTS:
            log.warning(
                "Page failed verification attempt %d/%d: %s",
                attempt_num + 1, MAX_REPAIR_ATTEMPTS + 1, vr.errors,
            )
            current_prompt = build_repair_prompt(current_json, vr.errors)
        else:
            raise GenerationError(
                f"Page still invalid after {MAX_REPAIR_ATTEMPTS + 1} attempts: {vr.errors}",
                attempts=attempts,
            )

    if generated is None:
        raise GenerationError("Generation loop ended without a result", attempts=attempts)

    # ------- Persist -------
    await _cache_set(cache_key, generated, attempts)

    log.info(
        "Page generated: %s ch%d p%d verified=%s attempts=%d",
        course_id, chapter, page, generated.verified, len(attempts),
    )
    return generated


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _cache_key(course_id: str, chapter: int, page: int, phash: str, version: str) -> str:
    raw = f"{course_id}:{chapter}:{page}:{phash}:{version}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


async def _cache_get(cache_key: str) -> GeneratedPage | None:
    try:
        from app.db.database import AsyncSessionLocal
        from app.db.models import GeneratedPage as GPModel
        from sqlalchemy import select
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(GPModel).where(
                    GPModel.cache_key == cache_key,
                    GPModel.status == "published",
                )
            )
            row = result.scalar_one_or_none()
            if row and row.content:
                return GeneratedPage.model_validate(row.content)
    except Exception:
        log.debug("Cache miss or error", exc_info=True)
    return None


async def _cache_set(cache_key: str, page: GeneratedPage, attempts: list[dict]) -> None:
    try:
        from app.db.database import AsyncSessionLocal
        from app.db.models import GeneratedPage as GPModel, PageGenLog
        async with AsyncSessionLocal() as db:
            # Upsert into generated_pages
            from sqlalchemy import select
            result = await db.execute(
                select(GPModel).where(GPModel.cache_key == cache_key)
            )
            existing = result.scalar_one_or_none()
            content = page.model_dump(by_alias=True)
            if existing:
                existing.content = content
                existing.version += 1
                existing.status = "published" if page.verified else "unverified"
                existing.updated_at = datetime.utcnow()
            else:
                db.add(GPModel(
                    id=str(uuid.uuid4()),
                    course_id=page.course_id,
                    chapter_number=page.chapter,
                    page_number=page.page,
                    cache_key=cache_key,
                    status="published" if page.verified else "unverified",
                    content=content,
                    version=1,
                ))
            # Log the generation attempt
            db.add(PageGenLog(
                id=str(uuid.uuid4()),
                cache_key=cache_key,
                course_id=page.course_id,
                chapter=page.chapter,
                page=page.page,
                attempts=attempts,
                success=page.verified,
            ))
            await db.commit()
    except Exception:
        log.warning("Failed to cache page", exc_info=True)


# ---------------------------------------------------------------------------
# KB retrieval helper
# ---------------------------------------------------------------------------

async def _retrieve_kb_passages(course_id: str, query: str) -> str:
    try:
        from app.knowledge import get_embedding_backend, get_vector_store
        from app.knowledge.retrieval import RetrievalEngine
        from app.config import get_settings
        s = get_settings()
        engine = RetrievalEngine(
            vector_store=get_vector_store(),
            embedding_backend=get_embedding_backend(),
            top_k=s.retrieval_top_k,
            score_threshold=-1.0,  # accept any score for generation
        )
        passages = await engine.retrieve(query, course_id=course_id)
        return "\n".join(p.wrapped_text for p in passages)
    except Exception:
        log.debug("KB retrieval failed (may not have any docs yet)", exc_info=True)
        return ""


def _strip_fences(text: str) -> str:
    """Remove markdown code fences if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Remove first and last fence
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    return text
