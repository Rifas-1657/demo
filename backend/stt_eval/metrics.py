"""
stt_eval/metrics.py — WER, CER, and Python-term recall metrics.
"""
from __future__ import annotations

import re
from typing import Sequence


def normalize_text(text: str) -> str:
    """Normalize text for comparison: lowercase, strip extra whitespace."""
    text = text.lower().strip()
    text = re.sub(r'\s+', ' ', text)
    return text


def compute_wer(reference: str, hypothesis: str) -> float:
    """
    Compute Word Error Rate (WER) using Levenshtein distance at word level.
    
    WER = (substitutions + deletions + insertions) / total_reference_words
    
    Returns 0.0 for perfect match, 1.0+ for more errors than reference words.
    """
    ref_words = normalize_text(reference).split()
    hyp_words = normalize_text(hypothesis).split()
    
    if not ref_words:
        return 0.0 if not hyp_words else 1.0
    
    # Levenshtein distance (edit distance) between word sequences
    d = [[0] * (len(hyp_words) + 1) for _ in range(len(ref_words) + 1)]
    
    for i in range(len(ref_words) + 1):
        d[i][0] = i
    for j in range(len(hyp_words) + 1):
        d[0][j] = j
    
    for i in range(1, len(ref_words) + 1):
        for j in range(1, len(hyp_words) + 1):
            if ref_words[i-1] == hyp_words[j-1]:
                d[i][j] = d[i-1][j-1]
            else:
                substitution = d[i-1][j-1] + 1
                insertion = d[i][j-1] + 1
                deletion = d[i-1][j] + 1
                d[i][j] = min(substitution, insertion, deletion)
    
    return d[len(ref_words)][len(hyp_words)] / len(ref_words)


def compute_cer(reference: str, hypothesis: str) -> float:
    """
    Compute Character Error Rate (CER) using Levenshtein distance at character level.
    
    CER = (substitutions + deletions + insertions) / total_reference_chars
    
    Returns 0.0 for perfect match.
    """
    ref_chars = list(normalize_text(reference))
    hyp_chars = list(normalize_text(hypothesis))
    
    if not ref_chars:
        return 0.0 if not hyp_chars else 1.0
    
    # Levenshtein distance at character level
    d = [[0] * (len(hyp_chars) + 1) for _ in range(len(ref_chars) + 1)]
    
    for i in range(len(ref_chars) + 1):
        d[i][0] = i
    for j in range(len(hyp_chars) + 1):
        d[0][j] = j
    
    for i in range(1, len(ref_chars) + 1):
        for j in range(1, len(hyp_chars) + 1):
            if ref_chars[i-1] == hyp_chars[j-1]:
                d[i][j] = d[i-1][j-1]
            else:
                substitution = d[i-1][j-1] + 1
                insertion = d[i][j-1] + 1
                deletion = d[i-1][j] + 1
                d[i][j] = min(substitution, insertion, deletion)
    
    return d[len(ref_chars)][len(hyp_chars)] / len(ref_chars)


def compute_python_term_recall(
    expected_terms: Sequence[str],
    hypothesis: str,
    glossary: dict[str, list[str]],
) -> tuple[float, list[str], list[str]]:
    """
    Compute Python-term recall: fraction of expected terms found in hypothesis.
    
    A term is considered found if it appears in the hypothesis in English
    (exact match) or as any accepted Tamil-script or transliterated variant
    from the glossary.
    
    Args:
        expected_terms: List of Python terms expected in the utterance (e.g., ["list", "function"])
        hypothesis: Transcribed text
        glossary: Dict mapping canonical English term -> list of accepted variants
    
    Returns:
        (recall, found_terms, missing_terms)
    """
    if not expected_terms:
        return 1.0, [], []
    
    hyp_normalized = normalize_text(hypothesis)
    found = []
    missing = []
    
    for term in expected_terms:
        term_lower = term.lower()
        variants = [term_lower]
        
        # Add glossary variants if available
        if term_lower in glossary:
            variants.extend(v.lower() for v in glossary[term_lower])
        
        # Check if any variant appears in hypothesis
        term_found = any(variant in hyp_normalized for variant in variants)
        
        if term_found:
            found.append(term)
        else:
            missing.append(term)
    
    recall = len(found) / len(expected_terms)
    return recall, found, missing


def compute_language_accuracy(
    expected_lang: str,
    detected_lang: str,
) -> bool:
    """
    Check if detected language matches expected language.
    
    Args:
        expected_lang: Expected BCP-47 language code (e.g., "ta", "en")
        detected_lang: Detected language code from STT provider
    
    Returns:
        True if languages match (case-insensitive prefix match)
    """
    if not expected_lang or not detected_lang:
        return False
    
    exp = expected_lang.lower().strip()
    det = detected_lang.lower().strip()
    
    # Allow prefix match (e.g., "ta" matches "ta-IN")
    return det.startswith(exp) or exp.startswith(det)
