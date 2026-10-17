"""
tests/test_stt_prompt_builder.py — Tests for context-aware prompt builder.
"""
import pytest
from pathlib import Path
import tempfile
import json

from app.voice.stt.prompt_builder import PromptBuilder, build_context_prompt


@pytest.fixture
def temp_glossary():
    """Create a temporary glossary file for testing."""
    glossary_data = {
        "list": ["லிஸ்ட்", "list"],
        "function": ["பங்க்ஷன்", "function"],
        "variable": ["வேரியபிள்", "variable"],
        "python": ["பைத்தான்", "python"],
        "dict": ["டிக்ட்", "dict"],
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(glossary_data, f)
        temp_path = Path(f.name)
    
    yield temp_path
    
    # Cleanup
    temp_path.unlink(missing_ok=True)


class TestPromptBuilder:
    """Tests for PromptBuilder class."""
    
    def test_initialization_with_glossary(self, temp_glossary):
        """Should load glossary on initialization."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        
        assert len(builder.glossary) == 5
        assert "list" in builder.glossary
        assert "function" in builder.glossary
    
    def test_initialization_without_glossary(self):
        """Should handle missing glossary gracefully."""
        builder = PromptBuilder(glossary_path=Path("/nonexistent/path.json"))
        
        assert builder.glossary == {}
    
    def test_build_prompt_without_context(self, temp_glossary):
        """Should build basic prompt without page context."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        prompt = builder.build_prompt()
        
        # Should contain some base terms
        assert "Python" in prompt
        assert "variable" in prompt or "function" in prompt
        assert len(prompt) > 50
    
    def test_build_prompt_with_page_title(self, temp_glossary):
        """Should include page title in prompt."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        prompt = builder.build_prompt(page_title="Python Lists")
        
        assert "Python Lists" in prompt
        assert len(prompt) > 50
    
    def test_build_prompt_with_keywords(self, temp_glossary):
        """Should prioritize page keywords."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        prompt = builder.build_prompt(page_keywords=["list", "append", "function"])
        
        # Should contain the keywords
        assert "list" in prompt.lower()
        assert "function" in prompt.lower()
    
    def test_build_prompt_with_full_context(self, temp_glossary):
        """Should build prompt with all context."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        prompt = builder.build_prompt(
            page_title="Python Lists Tutorial",
            page_keywords=["list", "append", "index"],
        )
        
        assert "Python Lists Tutorial" in prompt
        assert "list" in prompt.lower()
        assert len(prompt) > 50
    
    def test_prompt_contains_tamil_connectors(self, temp_glossary):
        """Prompt should contain natural Tamil connecting words."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        prompt = builder.build_prompt(page_title="Python Basics")
        
        # Should have Tamil text for natural Tanglish
        assert any(tamil_word in prompt for tamil_word in ["இல்", "பத்தி", "போன்ற", "மற்றும்"])
    
    def test_max_terms_limit(self, temp_glossary):
        """Should respect max_terms limit."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        
        # Build with many keywords
        many_keywords = ["term" + str(i) for i in range(100)]
        prompt = builder.build_prompt(page_keywords=many_keywords, max_terms=10)
        
        # Prompt should not be excessively long
        word_count = len(prompt.split())
        assert word_count < 150  # Reasonable length
    
    def test_get_hotwords_basic(self, temp_glossary):
        """Should generate hotwords list."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        hotwords = builder.get_hotwords()
        
        assert len(hotwords) > 0
        assert len(hotwords) <= 20  # Default max
        # Should only contain Latin script words
        for word in hotwords:
            assert all(ord(c) < 128 or c.isspace() for c in word)
    
    def test_get_hotwords_with_keywords(self, temp_glossary):
        """Should prioritize page keywords in hotwords."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        hotwords = builder.get_hotwords(page_keywords=["list", "function"])
        
        assert "list" in hotwords
        assert "function" in hotwords
    
    def test_get_hotwords_max_limit(self, temp_glossary):
        """Should respect max_words limit."""
        builder = PromptBuilder(glossary_path=temp_glossary)
        hotwords = builder.get_hotwords(max_words=5)
        
        assert len(hotwords) <= 5


def test_build_context_prompt_convenience():
    """Test convenience function."""
    prompt = build_context_prompt(
        page_title="Python Variables",
        page_keywords=["variable", "string"],
    )
    
    assert isinstance(prompt, str)
    assert len(prompt) > 0
