"""
app/tutor/scope_guard.py

Two-stage Python scope guard:

Stage 1 — Fast rules (zero LLM cost, ~0ms):
  - Too short / empty
  - Exact injection patterns
  - Block patterns (non-Python domains)
  - Allow-listed technical Python terms

Stage 2 — Classifier prompt (one fast LLM call):
  - Binary: in_scope / out_of_scope
  - Provides a brief reason + redirect suggestion for refusals

Block patterns are checked BEFORE allow-list so explicit domain blocks win.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Fast-path allow keywords (technical Python / CS terms)
_PYTHON_ALLOW = frozenset([
    "variable", "variables", "function", "functions", "loop", "loops", "list",
    "dict", "dictionary", "tuple", "set", "class", "object", "method",
    "import", "module", "library", "package", "print", "input", "type",
    "int", "str", "float", "bool", "none", "if", "else", "elif", "for",
    "while", "return", "lambda", "generator", "comprehension", "decorator",
    "exception", "error", "try", "except", "finally", "with", "open",
    "file", "read", "write", "async", "await", "coroutine", "thread",
    "process", "pip", "syntax", "indentation", "scope", "closure",
    "recursion", "algorithm", "data structure", "array", "index",
    "slice", "concatenation", "format", "f-string", "split", "join",
    # course-meta queries always in scope
    "explain", "what is", "how does", "why", "difference between",
    "example", "show me", "help", "understand", "chapter", "page",
    "practice", "quiz", "exercise",
])

# Fast-path block patterns (non-Python topics — checked BEFORE allow-list)
_BLOCK_PATTERNS = [
    # Alternative programming languages
    r"\bjava(?:script)?\b(?!.*python)",
    r"\bc\+\+\b", r"\bcsharp\b", r"\brust\b", r"\bgo\s+lang\b", r"\bkotlin\b",
    # Food / cooking
    r"\brecipes?\b", r"\bcooking?\b", r"\bfood\b",
    r"\bdosa\b", r"\bbiryani\b", r"\bcurry\b",
    # Entertainment
    r"\bmovie\s+review\b", r"\bserial\s+plot\b",
    r"\bnetflix\b", r"\bsun\s+tv\b", r"\btv\s+serial\b",
    r"\bfilm\b(?!.*python)",
    # Politics
    r"\bpolitics?\b", r"\belection\b", r"\bparliament\b",
    # Cricket / sports
    r"\bcricket\b", r"\b(?:csk|ipl|rcb|kkr|mi|srh)\b",
    r"\bmatch\s+score\b",
    r"\bsports?\b(?!.*example)",
    # Health / medical
    r"\bsymptoms?\b", r"\bcorona\b", r"\bcovid\b",
    # Finance / crypto
    r"\bstock\s+market\b", r"\bbitcoin\b", r"\bcryptocurrenc\w*\b",
    # Social media / hacking
    r"\bwhatsapp\b", r"\binstagram\b", r"\bfacebook\b",
    r"\bhack\s+panna\b",
    # Geography (general knowledge unrelated to CS)
    r"\bcapital\s+of\b",
    # Misc
    r"\bweather\b",
]
_BLOCK_RE = re.compile("|".join(_BLOCK_PATTERNS), re.IGNORECASE)

# Injection patterns
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"reveal\s+(your\s+)?(system\s+)?prompt",
    r"print\s+your\s+(system\s+)?prompt",
    r"forget\s+(everything|all|previous)",
    r"you\s+are\s+(now\s+)?(?:an?\s+)?(?:DAN|evil|jailbreak|free|unrestricted)",
    r"act\s+as\s+(if\s+)?(you\s+are|a)\s+(?!a student|a learner)",
    r"pretend\s+(you\s+are|to\s+be)",
    r"override\s+(your\s+)?(safety|rules?|guidelines?)",
    r"sudo\s+mode", r"developer\s+mode", r"jailbreak",
    r"what\s+are\s+your\s+(system\s+)?instructions",
    r"bypass\s+(?:\w+\s+)?(restrictions?|rules?|filters?|guidelines?)",
]
_INJECTION_RE = re.compile("|".join(_INJECTION_PATTERNS), re.IGNORECASE)

REFUSAL_TANGLISH = (
    "Naan Python learning-ku specialised assistant. "
    "Intha question Python-ku related-a illai, so answer panna mudiyathu. "
    "Python-la {suggestion} pathi kettaal gladly explain pannuven!"
)

INJECTION_REFUSAL = (
    "Naan oru Python tutor — system prompt reveal panna matten, "
    "roleplay panna matten, rules bypass panna matten. "
    "Python-pathi enna doubt irukkum-nu sollu!"
)


@dataclass
class ScopeResult:
    in_scope: bool
    is_injection: bool = False
    reason: str = ""
    suggestion: str = "variables or functions"


async def check_scope(question: str, llm_router=None) -> ScopeResult:
    q = question.strip()

    # Empty / too short
    if not q or len(q.split()) < 2:
        return ScopeResult(in_scope=True, reason="trivial/short — pass through")

    # Injection attempt (checked first, always)
    if _INJECTION_RE.search(q):
        return ScopeResult(in_scope=False, is_injection=True, reason="injection attempt detected")

    q_lower = q.lower()

    # Hard block patterns FIRST (so "Java vs Python (only Java)" is blocked by Java pattern)
    if _BLOCK_RE.search(q):
        return ScopeResult(in_scope=False, reason="non-Python topic detected by fast rules", suggestion="lists or loops")

    # Python allow-list (only if not blocked)
    for kw in _PYTHON_ALLOW:
        if kw in q_lower:
            return ScopeResult(in_scope=True, reason=f"keyword match: {kw!r}")

    # Ambiguous → LLM classifier
    if llm_router is not None:
        return await _classify_with_llm(q, llm_router)

    # No LLM available → optimistic pass
    return ScopeResult(in_scope=True, reason="no LLM classifier, optimistic pass")


_CLASSIFIER_SYSTEM = """\
You are a scope classifier for a Python programming tutor.
Reply ONLY with valid JSON: {"in_scope": true/false, "suggestion": "short Python topic suggestion"}.
in_scope = true  -> question is about Python programming, the course, or related CS concepts
in_scope = false -> question is about a completely unrelated topic (cricket scores, movies, cooking, politics, other languages)
"""

_CLASSIFIER_PROMPT = "Is this question in scope for a Python tutor?\nQuestion: {q}\n\nJSON:"


async def _classify_with_llm(question: str, llm_router) -> ScopeResult:
    import json
    try:
        resp = await llm_router.generate_json(
            prompt=_CLASSIFIER_PROMPT.format(q=question),
            schema={"in_scope": "boolean", "suggestion": "string"},
            system=_CLASSIFIER_SYSTEM,
            temperature=0.0,
            max_tokens=64,
            timeout=5.0,
        )
        data = json.loads(resp.text.strip())
        return ScopeResult(
            in_scope=bool(data.get("in_scope", True)),
            suggestion=data.get("suggestion", "loops or functions"),
            reason="llm classifier",
        )
    except Exception:
        return ScopeResult(in_scope=True, reason="llm classifier error — optimistic pass")
