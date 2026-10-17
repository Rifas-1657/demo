"""
app/voice/stt/corrector.py — LLM-based post-correction for STT transcripts.

Corrects misheard Python terms and obvious Tamil-English splits using:
- Glossary of accepted term variants
- Page context (current lesson topic)
- Strict no-invention prompt

The corrector NEVER adds content, changes meaning, or invents words.
When uncertain, it returns the original text unchanged.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

# Default glossary path
DEFAULT_GLOSSARY_PATH = Path(__file__).parent.parent.parent.parent / "stt_eval" / "glossary.json"

CORRECTION_SYSTEM_PROMPT = """You are a transcription correction assistant for Tamil-English code-mixed (Tanglish) speech about Python programming.

Your ONLY job is to fix obvious transcription errors in Python technical terms. You must:

1. ONLY correct misheard Python/programming terms using the provided glossary
2. NEVER add new words, content, or information
3. NEVER change the meaning or structure of the sentence
4. NEVER correct grammar or rephrase
5. NEVER translate between Tamil and English
6. Keep all Tamil words exactly as written
7. If uncertain, return the original text UNCHANGED

Examples of ALLOWED corrections:
- "లిస్ట్" → "list" (if glossary shows this is a variant of "list")
- "Python ல variable ஐ declare" → "Python ல variable ஐ declare" (already correct, no change)
- "list append செய்றது" → "list append செய்றது" (correct, no change needed)

Examples of FORBIDDEN changes:
- Adding missing words
- Changing Tamil words
- Fixing grammar
- Rephrasing or restructuring
- Translating Tamil to English or vice versa
- Inventing content not in the original

When in doubt, DO NOT correct. Return the original text."""

CORRECTION_USER_PROMPT_TEMPLATE = """Transcript: {transcript}

Glossary of Python terms (term: [accepted_variants]):
{glossary_sample}

Page context: {page_context}

Instructions:
1. Check if any words in the transcript are misheard versions of Python terms from the glossary
2. If yes, replace ONLY those specific misheard terms with the correct English version
3. If everything looks correct OR if you're unsure, return the original transcript unchanged
4. NEVER add, remove, or rephrase anything

Return ONLY the corrected transcript text (or original if no correction needed). No explanations."""


class TranscriptCorrector:
    """
    LLM-based corrector for STT transcripts.
    
    Uses existing LLM router to fix misheard Python terms while preserving
    the original meaning and structure.
    """
    
    def __init__(
        self,
        glossary_path: Path | None = None,
        provider: str = "gemini",
    ):
        """
        Initialize corrector.
        
        Args:
            glossary_path: Path to glossary.json
            provider: LLM provider to use (gemini, groq, etc.)
        """
        self.provider = provider
        self.glossary: dict[str, list[str]] = {}
        
        if glossary_path is None:
            glossary_path = DEFAULT_GLOSSARY_PATH
        
        if glossary_path.exists():
            try:
                self.glossary = json.loads(glossary_path.read_text(encoding="utf-8"))
                log.info("Loaded correction glossary with %d terms", len(self.glossary))
            except Exception as exc:
                log.warning("Failed to load correction glossary: %s", exc)
        else:
            log.warning("Correction glossary not found at %s", glossary_path)
    
    def _build_glossary_sample(self, page_keywords: list[str] | None = None) -> str:
        """
        Build a sample of glossary entries for the prompt.
        Prioritizes page keywords if provided.
        """
        if not self.glossary:
            return "(no glossary available)"
        
        # Include page keywords first
        entries = []
        if page_keywords:
            for keyword in page_keywords[:10]:
                keyword_lower = keyword.lower()
                if keyword_lower in self.glossary:
                    variants = self.glossary[keyword_lower][:3]  # Max 3 variants per term
                    entries.append(f"  {keyword_lower}: {variants}")
        
        # Fill with common terms
        common_terms = ["python", "list", "function", "variable", "dict", "loop", "class", "string"]
        for term in common_terms:
            if len(entries) >= 20:
                break
            if term not in [e.split(":")[0].strip() for e in entries]:
                if term in self.glossary:
                    variants = self.glossary[term][:3]
                    entries.append(f"  {term}: {variants}")
        
        return "\n".join(entries) if entries else "(no relevant terms)"
    
    async def correct(
        self,
        transcript: str,
        page_title: str | None = None,
        page_keywords: list[str] | None = None,
    ) -> tuple[str, bool]:
        """
        Correct transcript using LLM.
        
        Args:
            transcript: Original transcript from STT
            page_title: Current page/lesson title
            page_keywords: Key terms from current page
        
        Returns:
            (corrected_transcript, was_corrected)
            - corrected_transcript: Corrected text or original if correction failed/skipped
            - was_corrected: True if correction was applied, False otherwise
        """
        if not transcript or not transcript.strip():
            return transcript, False
        
        # Build page context
        page_context = "Unknown"
        if page_title:
            page_context = page_title
        if page_keywords:
            page_context += f" (keywords: {', '.join(page_keywords[:5])})"
        
        # Build glossary sample
        glossary_sample = self._build_glossary_sample(page_keywords)
        
        # Build prompt
        user_prompt = CORRECTION_USER_PROMPT_TEMPLATE.format(
            transcript=transcript,
            glossary_sample=glossary_sample,
            page_context=page_context,
        )
        
        try:
            # Import LLM router (lazy import to avoid circular dependencies)
            from app.llm.router import LLMRouter
            
            router = LLMRouter()
            
            # Request correction with strict temperature (deterministic)
            result = await router.chat(
                messages=[
                    {"role": "system", "content": CORRECTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                provider_preference=[self.provider],
                temperature=0.0,
                max_tokens=500,
            )
            
            corrected = result.content.strip()
            
            # Validation: if LLM returned garbage, keep original
            if not corrected:
                log.warning("Corrector returned empty text, keeping original")
                return transcript, False
            
            # Check if correction is suspiciously different (potential hallucination)
            original_words = set(transcript.lower().split())
            corrected_words = set(corrected.lower().split())
            
            # If more than 50% of words changed, reject correction
            common_words = original_words & corrected_words
            if len(original_words) > 0:
                similarity = len(common_words) / len(original_words)
                if similarity < 0.5:
                    log.warning(
                        "Corrector changed too many words (%.1f%% similarity), rejecting correction",
                        similarity * 100,
                    )
                    return transcript, False
            
            # Check if anything actually changed
            if corrected.strip() == transcript.strip():
                return transcript, False
            
            log.info("Transcript corrected: '%s' → '%s'", transcript[:50], corrected[:50])
            return corrected, True
            
        except Exception as exc:
            log.warning("Transcript correction failed: %s", exc)
            return transcript, False
    
    def is_available(self) -> bool:
        """Check if corrector is available (LLM router configured)."""
        try:
            from app.llm.router import LLMRouter
            router = LLMRouter()
            return router.has_available_provider()
        except Exception:
            return False


async def correct_transcript(
    transcript: str,
    page_title: str | None = None,
    page_keywords: list[str] | None = None,
    provider: str = "gemini",
    glossary_path: Path | None = None,
) -> tuple[str, bool]:
    """
    Convenience function to correct a transcript.
    
    Args:
        transcript: Original transcript from STT
        page_title: Current page/lesson title
        page_keywords: Key terms from current page
        provider: LLM provider to use
        glossary_path: Optional custom glossary path
    
    Returns:
        (corrected_transcript, was_corrected)
    """
    corrector = TranscriptCorrector(
        glossary_path=glossary_path,
        provider=provider,
    )
    return await corrector.correct(
        transcript=transcript,
        page_title=page_title,
        page_keywords=page_keywords,
    )
