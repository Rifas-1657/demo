"""
tests/test_stt_corrector.py — Tests for LLM-based transcript correction.
"""
import pytest
from pathlib import Path
import tempfile
import json
from unittest.mock import AsyncMock, MagicMock, patch

from app.voice.stt.corrector import TranscriptCorrector, correct_transcript


@pytest.fixture
def temp_glossary():
    """Create a temporary glossary file for testing."""
    glossary_data = {
        "list": ["లిస్ట్", "list"],
        "function": ["పంక్షన్", "function"],
        "variable": ["వేరియబిల్", "variable"],
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(glossary_data, f)
        temp_path = Path(f.name)
    
    yield temp_path
    
    # Cleanup
    temp_path.unlink(missing_ok=True)


@pytest.fixture
def mock_llm_router():
    """Mock LLM router for testing."""
    with patch('app.llm.router.LLMRouter') as mock:
        router_instance = MagicMock()
        mock.return_value = router_instance
        yield router_instance


class TestTranscriptCorrector:
    """Tests for TranscriptCorrector class."""
    
    def test_initialization_with_glossary(self, temp_glossary):
        """Should load glossary on initialization."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary)
        
        assert len(corrector.glossary) == 3
        assert "list" in corrector.glossary
    
    def test_initialization_without_glossary(self):
        """Should handle missing glossary gracefully."""
        corrector = TranscriptCorrector(glossary_path=Path("/nonexistent/path.json"))
        
        assert corrector.glossary == {}
    
    @pytest.mark.asyncio
    async def test_correct_empty_transcript(self, temp_glossary):
        """Should return empty transcript unchanged."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary)
        
        corrected, was_corrected = await corrector.correct("")
        
        assert corrected == ""
        assert was_corrected is False
    
    @pytest.mark.asyncio
    async def test_correct_with_valid_correction(self, temp_glossary, mock_llm_router):
        """Should apply valid correction from LLM."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary, provider="gemini")
        
        # Mock LLM response with minor correction
        mock_result = MagicMock()
        mock_result.content = "Python ல list use பண்றது"
        mock_llm_router.chat = AsyncMock(return_value=mock_result)
        mock_llm_router.has_available_provider = MagicMock(return_value=True)
        
        original = "Python ல లిస్ట్ use பண்றது"
        corrected, was_corrected = await corrector.correct(
            transcript=original,
            page_title="Python Lists",
        )
        
        assert corrected == "Python ல list use பண்றது"
        assert was_corrected is True
        
        # Verify LLM was called
        mock_llm_router.chat.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_correct_rejects_garbage_output(self, temp_glossary, mock_llm_router):
        """Should reject LLM output that changed too many words."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary, provider="gemini")
        
        # Mock LLM response with completely different text (garbage/hallucination)
        mock_result = MagicMock()
        mock_result.content = "This is completely different text that was hallucinated"
        mock_llm_router.chat = AsyncMock(return_value=mock_result)
        mock_llm_router.has_available_provider = MagicMock(return_value=True)
        
        original = "Python ல list use பண்றது எப்படி"
        corrected, was_corrected = await corrector.correct(
            transcript=original,
            page_title="Python Lists",
        )
        
        # Should keep original due to low similarity
        assert corrected == original
        assert was_corrected is False
    
    @pytest.mark.asyncio
    async def test_correct_rejects_empty_llm_output(self, temp_glossary, mock_llm_router):
        """Should reject empty LLM output."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary, provider="gemini")
        
        # Mock LLM response with empty string
        mock_result = MagicMock()
        mock_result.content = ""
        mock_llm_router.chat = AsyncMock(return_value=mock_result)
        mock_llm_router.has_available_provider = MagicMock(return_value=True)
        
        original = "Python ல list use பண்றது"
        corrected, was_corrected = await corrector.correct(
            transcript=original,
            page_title="Python Lists",
        )
        
        # Should keep original
        assert corrected == original
        assert was_corrected is False
    
    @pytest.mark.asyncio
    async def test_correct_no_change_needed(self, temp_glossary, mock_llm_router):
        """Should detect when no correction was applied."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary, provider="gemini")
        
        # Mock LLM returns same text (no correction needed)
        original = "Python ல list use பண்றது"
        mock_result = MagicMock()
        mock_result.content = original
        mock_llm_router.chat = AsyncMock(return_value=mock_result)
        mock_llm_router.has_available_provider = MagicMock(return_value=True)
        
        corrected, was_corrected = await corrector.correct(
            transcript=original,
            page_title="Python Lists",
        )
        
        assert corrected == original
        assert was_corrected is False
    
    @pytest.mark.asyncio
    async def test_correct_handles_llm_exception(self, temp_glossary, mock_llm_router):
        """Should handle LLM exceptions gracefully."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary, provider="gemini")
        
        # Mock LLM raises exception
        mock_llm_router.chat = AsyncMock(side_effect=Exception("LLM error"))
        mock_llm_router.has_available_provider = MagicMock(return_value=True)
        
        original = "Python ல list use பண்றது"
        corrected, was_corrected = await corrector.correct(
            transcript=original,
            page_title="Python Lists",
        )
        
        # Should return original on error
        assert corrected == original
        assert was_corrected is False
    
    @pytest.mark.asyncio
    async def test_correct_with_page_context(self, temp_glossary, mock_llm_router):
        """Should include page context in LLM prompt."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary, provider="gemini")
        
        mock_result = MagicMock()
        mock_result.content = "Python ல list மற்றும் function use பண்றது"
        mock_llm_router.chat = AsyncMock(return_value=mock_result)
        mock_llm_router.has_available_provider = MagicMock(return_value=True)
        
        original = "Python ல list மற்றும் function use பண்றது"
        corrected, was_corrected = await corrector.correct(
            transcript=original,
            page_title="Python Basics",
            page_keywords=["list", "function"],
        )
        
        # Verify chat was called with system and user prompts
        call_args = mock_llm_router.chat.call_args
        messages = call_args[1]["messages"]
        
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        
        # User prompt should contain page context
        user_content = messages[1]["content"]
        assert "Python Basics" in user_content
        assert "list" in user_content or "function" in user_content
    
    def test_is_available_with_router(self, mock_llm_router):
        """Should check if corrector is available."""
        corrector = TranscriptCorrector(provider="gemini")
        
        mock_llm_router.has_available_provider = MagicMock(return_value=True)
        
        assert corrector.is_available() is True
    
    def test_is_available_without_router(self):
        """Should return False when LLM router unavailable."""
        with patch('app.llm.router.LLMRouter', side_effect=ImportError):
            corrector = TranscriptCorrector(provider="gemini")
            assert corrector.is_available() is False
    
    def test_build_glossary_sample_with_keywords(self, temp_glossary):
        """Should prioritize page keywords in glossary sample."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary)
        
        sample = corrector._build_glossary_sample(page_keywords=["list", "function"])
        
        assert "list" in sample
        assert "function" in sample
    
    def test_build_glossary_sample_without_keywords(self, temp_glossary):
        """Should include common terms when no keywords provided."""
        corrector = TranscriptCorrector(glossary_path=temp_glossary)
        
        sample = corrector._build_glossary_sample()
        
        # Should have some terms
        assert len(sample) > 10


@pytest.mark.asyncio
async def test_correct_transcript_convenience(temp_glossary, mock_llm_router):
    """Test convenience function."""
    mock_result = MagicMock()
    mock_result.content = "Python list"
    mock_llm_router.chat = AsyncMock(return_value=mock_result)
    mock_llm_router.has_available_provider = MagicMock(return_value=True)
    
    corrected, was_corrected = await correct_transcript(
        transcript="Python లిస్ట్",
        page_title="Python Basics",
        glossary_path=temp_glossary,
    )
    
    assert isinstance(corrected, str)
    assert isinstance(was_corrected, bool)
