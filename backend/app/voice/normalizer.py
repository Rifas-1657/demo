"""
app/voice/normalizer.py

Text normalizer for Tanglish TTS.

Transforms input text so TTS providers produce natural speech:
- Numbers: "42" → "forty two", "3.14" → "three point one four"
- Currency: "$10" → "ten dollars"
- Code identifiers: snake_case → space-separated words ("my_list" → "my list")
- Code punctuation: "x += 1" → "x plus equals 1"
- Special chars: "!=" → "not equal", "==" → "equals equals"
- URLs: replaced with "URL"
- Markdown: stripped (**, *, `, _)
- Abbreviations: "API" → "A P I" (letter-by-letter for unknown acronyms)
"""
from __future__ import annotations

import re

# --- Operator replacements ---
_OPERATORS = [
    (r"!=",  " not equal "),
    (r"==",  " equals "),
    (r"<=",  " less than or equal "),
    (r">=",  " greater than or equal "),
    (r"->",  " arrow "),
    (r"\+=", " plus equals "),
    (r"-=",  " minus equals "),
    (r"\*=", " times equals "),
    (r"//=", " floor divide equals "),
    (r"//",  " floor divide "),
    (r"\*\*","raised to "),
    (r"&&",  " and "),
    (r"\|\|"," or "),
    (r"<<",  " left shift "),
    (r">>",  " right shift "),
]

_CURRENCY = [
    (r"\$(\d+(?:\.\d+)?)", lambda m: f"{_num_words(m.group(1))} dollars"),
    (r"₹(\d+(?:\.\d+)?)",  lambda m: f"{_num_words(m.group(1))} rupees"),
]

_URL_RE = re.compile(r"https?://\S+")
_MD_RE  = re.compile(r"`+|\*{1,3}")
_SNAKE_RE = re.compile(r"\b([a-z][a-z0-9]*)(_[a-z0-9]+)+\b")
_ACRONYM_RE = re.compile(r"\b([A-Z]{2,})\b")
_CODE_FENCE_RE = re.compile(r"```[\s\S]*?```")

_SMALL_NUMS = [
    "zero","one","two","three","four","five","six","seven","eight","nine","ten",
    "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen",
    "eighteen","nineteen",
]
_TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"]


def _num_words(n_str: str) -> str:
    """Convert a number string to English words (handles integers up to 999)."""
    try:
        if "." in n_str:
            int_part, dec_part = n_str.split(".", 1)
            return f"{_num_words(int_part)} point {' '.join(_num_words(d) for d in dec_part)}"
        n = int(n_str)
        if n < 0:
            return f"negative {_num_words(str(-n))}"
        if n < 20:
            return _SMALL_NUMS[n]
        if n < 100:
            ones = n % 10
            return _TENS[n // 10] + (f" {_SMALL_NUMS[ones]}" if ones else "")
        if n < 1000:
            hundreds = n // 100
            rest = n % 100
            return f"{_SMALL_NUMS[hundreds]} hundred" + (f" {_num_words(str(rest))}" if rest else "")
        return n_str  # too large
    except (ValueError, IndexError):
        return n_str


def normalize_for_tts(text: str) -> str:
    """
    Normalize *text* for TTS synthesis.
    Operates in Latin script (Tanglish in Latin form, not Tamil Unicode script).
    """
    # Remove code fences (entire block read separately in segments)
    text = _CODE_FENCE_RE.sub(" code block ", text)

    # URLs
    text = _URL_RE.sub(" URL ", text)

    # snake_case identifiers → spaced words (BEFORE markdown strip so _ is present)
    text = _SNAKE_RE.sub(lambda m: m.group(0).replace("_", " "), text)

    # Markdown decoration (backticks and asterisks only; _ already handled above)
    text = _MD_RE.sub("", text)

    # Operators (before number normalization)
    for pat, repl in _OPERATORS:
        text = re.sub(pat, repl, text)

    # Currency
    for pat, repl in _CURRENCY:
        text = re.sub(pat, repl, text)

    # Numbers (standalone digits)
    text = re.sub(r"\b(\d+(?:\.\d+)?)\b", lambda m: _num_words(m.group(1)), text)

    # Unknown ALL-CAPS acronyms → letter-by-letter
    def _acronym_expand(m: re.Match) -> str:
        word = m.group(1)
        # Known acronyms keep as-is
        _KNOWN = {"API", "URL", "HTTP", "JSON", "SQL", "CPU", "GPU", "RAM",
                  "IDE", "OOP", "CLI", "GUI", "AI", "ML", "STT", "TTS"}
        if word in _KNOWN:
            return word
        return " ".join(list(word))  # spell out letter by letter

    text = _ACRONYM_RE.sub(_acronym_expand, text)

    # Collapse extra whitespace
    text = re.sub(r"\s{2,}", " ", text).strip()
    return text


def estimate_word_timings(
    text: str,
    duration_ms: int,
    words_per_minute: int = 150,
) -> list[dict]:
    """
    Estimate per-word start/end timestamps when the TTS provider doesn't supply them.
    Uses character-count-weighted distribution over audio duration.
    Punctuation adds a small pause.
    """
    words = text.split()
    if not words or duration_ms <= 0:
        return []

    # Character weights (punctuation adds 20% pause)
    weights = []
    for w in words:
        base = max(1, len(w))
        if w and w[-1] in ".!?;":
            base = int(base * 1.5)
        elif w and w[-1] in ",":
            base = int(base * 1.2)
        weights.append(base)

    total_weight = sum(weights)
    timings = []
    cursor = 0
    for word, weight in zip(words, weights):
        share = weight / total_weight
        dur = int(duration_ms * share)
        timings.append({
            "word": word,
            "startMs": cursor,
            "endMs": cursor + dur,
        })
        cursor += dur

    return timings
