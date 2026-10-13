"""
app/knowledge/retrieval.py

Hybrid retrieval engine (vector + keyword) with MMR de-duplication,
course + access control filtering, prompt-injection defense.

Pipeline:
  1. Embed query with the configured embedding backend
  2. Vector ANN search (Chroma or pgvector) — filtered by course + allowed doc IDs
  3. Keyword BM25-style filter: re-score results that contain query tokens
  4. MMR (Maximal Marginal Relevance) to reduce redundancy
  5. Optional score threshold filter
  6. Return RetrievedPassage list with full provenance

Prompt-injection defense:
  - Retrieved text is wrapped in hard delimiters:
      === RETRIEVED DOCUMENT PASSAGE [i] ===
      ... text ...
      === END PASSAGE [i] ===
  - Per-chunk text is capped at MAX_CHUNK_CHARS (4000 chars) before wrapping
  - Total context is capped at MAX_CONTEXT_CHARS (12000 chars)
  - System prompt (caller's responsibility) must declare these as data, not instructions

Tests confirm: "ignore all instructions", "reveal system prompt", "obey document"
→ none are obeyed because the retrieval layer only RETURNS passages;
  the LLM prompt engineering (B3) enforces the boundary.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.knowledge.embeddings import EmbeddingBackend
from app.knowledge.vectorstore import VectorMatch, VectorStore

MAX_CHUNK_CHARS   = 4_000   # per retrieved chunk, before wrapping
MAX_CONTEXT_CHARS = 12_000  # total across all chunks returned to caller
MMR_LAMBDA        = 0.7     # weight for relevance vs diversity (0=diversity, 1=relevance)


@dataclass
class RetrievedPassage:
    chunk_id: str
    document_id: str
    text: str           # raw text (stripped to MAX_CHUNK_CHARS)
    wrapped_text: str   # prompt-injection-safe wrapped text
    score: float
    page_number: int
    heading_path: list[str]
    token_count: int
    course_id: str      # provenance


class RetrievalEngine:
    def __init__(
        self,
        vector_store: VectorStore,
        embedding_backend: EmbeddingBackend,
        top_k: int = 5,
        score_threshold: float = 0.0,
        mmr_lambda: float = MMR_LAMBDA,
    ) -> None:
        self._vs = vector_store
        self._emb = embedding_backend
        self._top_k = top_k
        self._score_threshold = score_threshold
        self._mmr_lambda = mmr_lambda

    async def retrieve(
        self,
        query: str,
        course_id: str,
        allowed_document_ids: list[str] | None = None,
        top_k: int | None = None,
        score_threshold: float | None = None,
    ) -> list[RetrievedPassage]:
        """
        Retrieve relevant passages for *query* within *course_id*.
        *allowed_document_ids*: if provided, only these docs are searched.
          Pass an empty list [] to return nothing (no access).
          Pass None to search all docs in the course.
        """
        k = top_k if top_k is not None else self._top_k
        threshold = score_threshold if score_threshold is not None else self._score_threshold

        # Short-circuit: empty allowed list = no access
        if allowed_document_ids is not None and len(allowed_document_ids) == 0:
            return []

        # 1. Embed query
        query_vec = await self._emb.embed_one(query)

        # 2. ANN search — fetch more than top_k for MMR headroom
        candidates = await self._vs.query(
            course_id=course_id,
            embedding_model=self._emb.name,
            dimension=self._emb.dimension,
            query_vector=query_vec,
            top_k=k * 4,
            document_ids=allowed_document_ids,
        )

        # 3. Score threshold filter
        candidates = [c for c in candidates if c.score >= threshold]

        # 4. Keyword boost: re-rank candidates that contain query tokens
        candidates = _keyword_boost(candidates, query)

        # 5. MMR de-duplication
        selected = _mmr(candidates, query_vec, k, self._mmr_lambda)

        # 6. Build result with prompt-injection defense
        passages: list[RetrievedPassage] = []
        total_chars = 0
        for i, match in enumerate(selected):
            raw = match.text[:MAX_CHUNK_CHARS]
            wrapped = _wrap_passage(raw, i + 1)
            total_chars += len(wrapped)
            if total_chars > MAX_CONTEXT_CHARS:
                break
            passages.append(RetrievedPassage(
                chunk_id=match.chunk_id,
                document_id=match.document_id,
                text=raw,
                wrapped_text=wrapped,
                score=match.score,
                page_number=match.page_number,
                heading_path=match.heading_path,
                token_count=match.token_count,
                course_id=course_id,
            ))

        return passages


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _keyword_boost(matches: list[VectorMatch], query: str) -> list[VectorMatch]:
    """Boost score for matches containing query keywords."""
    tokens = set(re.findall(r"\w+", query.lower()))
    if not tokens:
        return matches
    boosted = []
    for m in matches:
        text_lower = m.text.lower()
        hit_ratio = sum(1 for t in tokens if t in text_lower) / len(tokens)
        boosted.append(VectorMatch(
            chunk_id=m.chunk_id,
            document_id=m.document_id,
            text=m.text,
            score=m.score + 0.1 * hit_ratio,  # small boost
            page_number=m.page_number,
            heading_path=m.heading_path,
            token_count=m.token_count,
        ))
    return sorted(boosted, key=lambda x: x.score, reverse=True)


def _cosine_sim(a: list[float], b_dict: dict[str, float]) -> float:
    """Approximate cosine sim using dot product on sparse representation."""
    # For MMR we use the stored score as a proxy for query similarity
    return 0.0  # placeholder — real impl uses stored vectors


def _mmr(
    candidates: list[VectorMatch],
    query_vec: list[float],
    k: int,
    lam: float,
) -> list[VectorMatch]:
    """
    Maximal Marginal Relevance selection.
    Uses candidate scores as proxy for query similarity.
    Diversity measured by text overlap (Jaccard on word sets).
    """
    if not candidates:
        return []

    selected: list[VectorMatch] = []
    remaining = list(candidates)

    while remaining and len(selected) < k:
        best = None
        best_score = -1.0
        for cand in remaining:
            relevance = cand.score
            if not selected:
                mmr_score = relevance
            else:
                # diversity: 1 - max Jaccard similarity to already selected
                max_sim = max(
                    _jaccard(cand.text, s.text) for s in selected
                )
                mmr_score = lam * relevance - (1 - lam) * max_sim
            if mmr_score > best_score:
                best_score = mmr_score
                best = cand
        if best:
            selected.append(best)
            remaining.remove(best)

    return selected


def _jaccard(a: str, b: str) -> float:
    wa = set(a.lower().split())
    wb = set(b.lower().split())
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)


def _wrap_passage(text: str, index: int) -> str:
    """
    Wrap retrieved text in hard delimiters.
    The system prompt (B3) declares everything between delimiters as
    untrusted data, not instructions. This is the primary injection defense.
    """
    return (
        f"\n=== RETRIEVED DOCUMENT PASSAGE [{index}] ===\n"
        f"{text}\n"
        f"=== END PASSAGE [{index}] ===\n"
    )
