"""
app/voice/stt/prompt_builder.py — Context-aware prompt/hotword generation for STT.

Builds initial_prompt from:
1. Glossary terms (Python vocabulary)
2. Page context (current lesson title, keywords)
3. Natural Tanglish phrasing to bias model toward English terms in Latin script
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Sequence

log = logging.getLogger(__name__)

# Default glossary path (relative to backend/)
DEFAULT_GLOSSARY_PATH = Path(__file__).parent.parent.parent.parent / "stt_eval" / "glossary.json"


class PromptBuilder:
    """
    Builds context-aware prompts for STT transcription.
    
    The prompt is written in natural Tanglish to guide the model:
    - Keep English technical terms in Latin script
    - Recognize Tamil words with proper Tamil script
    - Understand code-mixed speech patterns
    """
    
    def __init__(self, glossary_path: Path | None = None):
        """
        Initialize prompt builder with glossary.
        
        Args:
            glossary_path: Path to glossary.json (maps term -> variants)
        """
        self.glossary: dict[str, list[str]] = {}
        
        if glossary_path is None:
            glossary_path = DEFAULT_GLOSSARY_PATH
        
        if glossary_path.exists():
            try:
                self.glossary = json.loads(glossary_path.read_text(encoding="utf-8"))
                log.info("Loaded STT glossary with %d terms from %s", len(self.glossary), glossary_path)
            except Exception as exc:
                log.warning("Failed to load STT glossary from %s: %s", glossary_path, exc)
        else:
            log.warning("STT glossary not found at %s, using empty glossary", glossary_path)
    
    def build_prompt(
        self,
        page_title: str | None = None,
        page_keywords: Sequence[str] | None = None,
        max_terms: int = 50,
    ) -> str:
        """
        Build context-aware initial prompt for STT.
        
        Args:
            page_title: Current page/lesson title (e.g., "Python Lists")
            page_keywords: Key terms from current page (e.g., ["list", "append", "index"])
            max_terms: Maximum number of terms to include in prompt
        
        Returns:
            Natural Tanglish prompt string with relevant technical terms
        """
        # Start with base terms (common across all contexts)
        base_terms = [
            "Python", "React", "JavaScript", "TypeScript", "FastAPI",
            "variable", "function", "class", "method", "loop",
            "list", "dict", "string", "integer", "boolean",
            "if", "else", "for", "while", "return",
            "import", "from", "print", "input", "len",
        ]
        
        # Add page-specific keywords if provided
        relevant_terms = set(base_terms)
        
        if page_keywords:
            # Add keywords and their glossary variants
            for keyword in page_keywords:
                keyword_lower = keyword.lower().strip()
                if keyword_lower:
                    relevant_terms.add(keyword_lower)
                    # Add first English variant from glossary if available
                    if keyword_lower in self.glossary:
                        variants = self.glossary[keyword_lower]
                        # Find English variant (Latin script only)
                        for variant in variants:
                            if all(ord(c) < 128 or c.isspace() for c in variant):
                                relevant_terms.add(variant)
                                break
        
        # Extract terms from page title
        if page_title:
            title_words = page_title.lower().split()
            for word in title_words:
                word_clean = word.strip(",.!?;:")
                if word_clean in self.glossary:
                    relevant_terms.add(word_clean)
        
        # Limit to max_terms
        term_list = sorted(relevant_terms)[:max_terms]
        
        # Build natural Tanglish prompt
        # Use Tamil connecting words to make it sound like natural Tanglish speech
        # This biases the model toward recognizing English terms in Latin script
        
        if page_title:
            prompt_parts = [f"இந்த lesson {page_title} பத்தி:"]
        else:
            prompt_parts = ["Python programming இல்:"]
        
        # Add terms in groups of 5-7 with natural connectors
        term_groups = [term_list[i:i+6] for i in range(0, len(term_list), 6)]
        
        for i, group in enumerate(term_groups[:5]):  # Max 5 groups to keep prompt reasonable
            if i == 0:
                prompt_parts.append(", ".join(group))
            else:
                prompt_parts.append("மற்றும் " + ", ".join(group))
        
        prompt_parts.append("போன்ற terms use பண்றோம்.")
        
        prompt = " ".join(prompt_parts)
        
        # Fallback if prompt is too short
        if len(prompt) < 50:
            prompt = "Python programming: " + ", ".join(term_list[:30])
        
        return prompt
    
    def get_hotwords(
        self,
        page_keywords: Sequence[str] | None = None,
        max_words: int = 20,
    ) -> list[str]:
        """
        Get list of hotwords for providers that support hotword boosting.
        
        Args:
            page_keywords: Key terms from current page
            max_words: Maximum number of hotwords
        
        Returns:
            List of hotwords (English technical terms only)
        """
        hotwords = set()
        
        # Add page keywords
        if page_keywords:
            for keyword in page_keywords:
                keyword_lower = keyword.lower().strip()
                if keyword_lower and all(ord(c) < 128 or c.isspace() for c in keyword_lower):
                    hotwords.add(keyword_lower)
        
        # Fill with common terms if needed
        if len(hotwords) < max_words:
            common = [
                "Python", "React", "JavaScript", "FastAPI", "API",
                "variable", "function", "class", "list", "dict",
                "loop", "if", "else", "return", "import",
                "print", "string", "integer", "method", "array",
            ]
            for term in common:
                if len(hotwords) >= max_words:
                    break
                hotwords.add(term)
        
        return sorted(hotwords)[:max_words]


def build_context_prompt(
    page_title: str | None = None,
    page_keywords: Sequence[str] | None = None,
    glossary_path: Path | None = None,
) -> str:
    """
    Convenience function to build context-aware prompt.
    
    Args:
        page_title: Current page/lesson title
        page_keywords: Key terms from current page
        glossary_path: Optional custom glossary path
    
    Returns:
        Context-aware prompt string
    """
    builder = PromptBuilder(glossary_path=glossary_path)
    return builder.build_prompt(page_title=page_title, page_keywords=page_keywords)
