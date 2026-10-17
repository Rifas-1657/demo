"""
tests/test_stt_metrics.py — Tests for STT evaluation metrics.
"""
import pytest

from stt_eval.metrics import (
    compute_cer,
    compute_language_accuracy,
    compute_python_term_recall,
    compute_wer,
)


class TestWER:
    """Tests for Word Error Rate calculation."""
    
    def test_identical_text(self):
        """WER should be 0 for identical text."""
        ref = "Python ல variable ஐ declare பண்றது"
        hyp = "Python ல variable ஐ declare பண்றது"
        assert compute_wer(ref, hyp) == 0.0
    
    def test_one_substitution(self):
        """WER should count substitutions."""
        ref = "list ல element add பண்றது"
        hyp = "list ல element adds பண்றது"
        wer = compute_wer(ref, hyp)
        assert wer == pytest.approx(1/5, abs=0.01)  # 1 error in 5 words
    
    def test_one_insertion(self):
        """WER should count insertions."""
        ref = "function define பண்றது"
        hyp = "function ஐ define பண்றது"
        wer = compute_wer(ref, hyp)
        assert wer == pytest.approx(1/3, abs=0.01)  # 1 insertion
    
    def test_one_deletion(self):
        """WER should count deletions."""
        ref = "Python dict ஐ use பண்றது"
        hyp = "Python dict use பண்றது"
        wer = compute_wer(ref, hyp)
        assert wer == pytest.approx(1/5, abs=0.01)  # 1 deletion
    
    def test_empty_reference(self):
        """WER should handle empty reference."""
        assert compute_wer("", "something") == 1.0
        assert compute_wer("", "") == 0.0
    
    def test_case_insensitive(self):
        """WER should be case-insensitive."""
        ref = "Python LIST"
        hyp = "python list"
        assert compute_wer(ref, hyp) == 0.0


class TestCER:
    """Tests for Character Error Rate calculation."""
    
    def test_identical_text(self):
        """CER should be 0 for identical text."""
        ref = "Python variable"
        hyp = "Python variable"
        assert compute_cer(ref, hyp) == 0.0
    
    def test_one_char_substitution(self):
        """CER should count character substitutions."""
        ref = "list"
        hyp = "last"
        cer = compute_cer(ref, hyp)
        # 1 char difference in 4 chars
        assert cer == pytest.approx(1/4, abs=0.01)
    
    def test_tamil_characters(self):
        """CER should handle Tamil unicode correctly."""
        ref = "variable ஐ declare"
        hyp = "variable ல declare"
        # ஐ vs ல is 1 character difference
        cer = compute_cer(ref, hyp)
        assert cer > 0.0
        assert cer < 0.2  # Should be small error


class TestPythonTermRecall:
    """Tests for Python term recall metric."""
    
    def test_all_terms_found(self):
        """Recall should be 1.0 when all terms found."""
        expected = ["list", "function", "variable"]
        hypothesis = "Python ல list மற்றும் function மற்றும் variable use பண்றோம்"
        glossary = {}
        
        recall, found, missing = compute_python_term_recall(expected, hypothesis, glossary)
        
        assert recall == 1.0
        assert set(found) == {"list", "function", "variable"}
        assert missing == []
    
    def test_partial_terms_found(self):
        """Recall should be partial when some terms missing."""
        expected = ["list", "function", "variable"]
        hypothesis = "Python ல list use பண்றோம்"
        glossary = {}
        
        recall, found, missing = compute_python_term_recall(expected, hypothesis, glossary)
        
        assert recall == pytest.approx(1/3, abs=0.01)
        assert found == ["list"]
        assert set(missing) == {"function", "variable"}
    
    def test_glossary_variants(self):
        """Should recognize glossary variants."""
        expected = ["list", "function"]
        hypothesis = "Python ல லிஸ்ட் மற்றும் பங்க்ஷன் use பண்றோம்"
        glossary = {
            "list": ["லிஸ்ட்", "list"],
            "function": ["பங்க்ஷன்", "function"],
        }
        
        recall, found, missing = compute_python_term_recall(expected, hypothesis, glossary)
        
        assert recall == 1.0
        assert set(found) == {"list", "function"}
        assert missing == []
    
    def test_case_insensitive_matching(self):
        """Term matching should be case-insensitive."""
        expected = ["Python", "LIST"]
        hypothesis = "python மற்றும் list use பண்றோம்"
        glossary = {}
        
        recall, found, missing = compute_python_term_recall(expected, hypothesis, glossary)
        
        assert recall == 1.0
    
    def test_empty_expected_terms(self):
        """Recall should be 1.0 for empty expected list."""
        expected = []
        hypothesis = "anything"
        glossary = {}
        
        recall, found, missing = compute_python_term_recall(expected, hypothesis, glossary)
        
        assert recall == 1.0
        assert found == []
        assert missing == []


class TestLanguageAccuracy:
    """Tests for language detection accuracy."""
    
    def test_exact_match(self):
        """Should match exact language codes."""
        assert compute_language_accuracy("ta", "ta") is True
        assert compute_language_accuracy("en", "en") is True
    
    def test_prefix_match(self):
        """Should match language code prefixes."""
        assert compute_language_accuracy("ta", "ta-IN") is True
        assert compute_language_accuracy("en", "en-US") is True
    
    def test_case_insensitive(self):
        """Should be case-insensitive."""
        assert compute_language_accuracy("TA", "ta") is True
        assert compute_language_accuracy("ta", "TA-IN") is True
    
    def test_mismatch(self):
        """Should return False for mismatched languages."""
        assert compute_language_accuracy("ta", "en") is False
        assert compute_language_accuracy("en", "ta") is False
    
    def test_empty_values(self):
        """Should handle empty values."""
        assert compute_language_accuracy("", "ta") is False
        assert compute_language_accuracy("ta", "") is False
        assert compute_language_accuracy("", "") is False
