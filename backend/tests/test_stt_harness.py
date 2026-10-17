"""
tests/test_stt_harness.py — Tests for STT evaluation harness on tiny fixture.
"""
import pytest
from pathlib import Path
import tempfile
import csv
import json
from unittest.mock import AsyncMock, MagicMock

from stt_eval.harness import evaluate_provider
from stt_eval.manifest import ManifestEntry
from app.voice import STTResult


@pytest.fixture
def temp_test_dir():
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def test_glossary(temp_test_dir):
    """Create a test glossary."""
    glossary = {
        "list": ["లిస్ట్", "list"],
        "python": ["పైథాన్", "python"],
    }
    
    glossary_path = temp_test_dir / "test_glossary.json"
    glossary_path.write_text(json.dumps(glossary), encoding="utf-8")
    
    return glossary


@pytest.fixture
def test_manifest_entries():
    """Create test manifest entries (no real audio)."""
    return [
        ManifestEntry(
            id="test01",
            audio_file="audio/test01.wav",
            reference_text="Python ல list use பண்றது",
            language="ta",
            expected_terms=["python", "list"],
        ),
        ManifestEntry(
            id="test02",
            audio_file="audio/test02.wav",
            reference_text="function define பண்றது",
            language="ta",
            expected_terms=["function"],
        ),
    ]


@pytest.fixture
def mock_stt_provider():
    """Create a mock STT provider."""
    provider = MagicMock()
    provider.name = "mock-stt"
    
    async def mock_transcribe(audio_bytes, mime, hint_lang=None):
        # Return different results based on audio file size
        if len(audio_bytes) < 100:
            # First file: perfect transcription
            return STTResult(
                transcript="Python ல list use பண்றது",
                language="ta",
                confidence=0.95,
                duration_s=2.5,
            )
        else:
            # Second file: one error
            return STTResult(
                transcript="function defined பண்றது",  # "defined" instead of "define"
                language="ta",
                confidence=0.90,
                duration_s=1.8,
            )
    
    provider.transcribe = mock_transcribe
    
    return provider


@pytest.mark.asyncio
async def test_evaluate_provider_basic(
    temp_test_dir,
    test_glossary,
    test_manifest_entries,
    mock_stt_provider,
):
    """Test basic provider evaluation with mock audio."""
    # Create fake audio files
    audio_dir = temp_test_dir / "audio"
    audio_dir.mkdir()
    
    (audio_dir / "test01.wav").write_bytes(b"fake audio data short")  # < 100 bytes
    (audio_dir / "test02.wav").write_bytes(b"fake audio data longer" * 10)  # > 100 bytes
    
    # Run evaluation
    results, summary = await evaluate_provider(
        provider_name="mock-stt",
        provider=mock_stt_provider,
        entries=test_manifest_entries,
        glossary=test_glossary,
        audio_base_path=temp_test_dir,
    )
    
    # Check results
    assert len(results) == 2
    assert summary.provider_name == "mock-stt"
    assert summary.total_samples == 2
    assert summary.successful == 2
    assert summary.failed == 0
    
    # First result should be perfect
    assert results[0].id == "test01"
    assert results[0].wer == 0.0
    assert results[0].python_term_recall == 1.0  # Both python and list found
    assert results[0].language_correct is True
    
    # Second result should have some errors
    assert results[1].id == "test02"
    assert results[1].wer > 0.0  # "define" vs "defined"
    assert results[1].python_term_recall == 1.0  # "function" found


@pytest.mark.asyncio
async def test_evaluate_provider_missing_audio(
    temp_test_dir,
    test_glossary,
    test_manifest_entries,
    mock_stt_provider,
):
    """Test evaluation with missing audio files."""
    # Don't create audio files
    
    results, summary = await evaluate_provider(
        provider_name="mock-stt",
        provider=mock_stt_provider,
        entries=test_manifest_entries,
        glossary=test_glossary,
        audio_base_path=temp_test_dir,
    )
    
    # Should have error results
    assert len(results) == 2
    assert summary.failed == 2
    assert summary.successful == 0
    
    for result in results:
        assert result.error is not None
        assert "not found" in result.error.lower()


@pytest.mark.asyncio
async def test_evaluate_provider_exception_handling(
    temp_test_dir,
    test_glossary,
    test_manifest_entries,
):
    """Test evaluation handles provider exceptions."""
    # Create fake audio
    audio_dir = temp_test_dir / "audio"
    audio_dir.mkdir()
    (audio_dir / "test01.wav").write_bytes(b"fake audio")
    (audio_dir / "test02.wav").write_bytes(b"fake audio")
    
    # Create provider that raises exception
    failing_provider = MagicMock()
    failing_provider.name = "failing-stt"
    
    async def mock_transcribe_fail(audio_bytes, mime, hint_lang=None):
        raise RuntimeError("Provider error")
    
    failing_provider.transcribe = mock_transcribe_fail
    
    results, summary = await evaluate_provider(
        provider_name="failing-stt",
        provider=failing_provider,
        entries=test_manifest_entries,
        glossary=test_glossary,
        audio_base_path=temp_test_dir,
    )
    
    # Should have error results
    assert len(results) == 2
    assert summary.failed == 2
    assert summary.successful == 0
    
    for result in results:
        assert result.error is not None
        assert "Provider error" in result.error


@pytest.mark.asyncio
async def test_evaluate_provider_metrics_calculation(
    temp_test_dir,
    test_glossary,
    mock_stt_provider,
):
    """Test that summary metrics are calculated correctly."""
    # Single entry
    entries = [
        ManifestEntry(
            id="test01",
            audio_file="audio/test01.wav",
            reference_text="Python ல list use பண்றது",
            language="ta",
            expected_terms=["python", "list"],
        ),
    ]
    
    # Create fake audio
    audio_dir = temp_test_dir / "audio"
    audio_dir.mkdir()
    (audio_dir / "test01.wav").write_bytes(b"fake")
    
    results, summary = await evaluate_provider(
        provider_name="mock-stt",
        provider=mock_stt_provider,
        entries=entries,
        glossary=test_glossary,
        audio_base_path=temp_test_dir,
    )
    
    # Check summary metrics
    assert summary.mean_wer >= 0.0
    assert summary.mean_cer >= 0.0
    assert summary.mean_python_term_recall >= 0.0 and summary.mean_python_term_recall <= 1.0
    assert summary.language_accuracy >= 0.0 and summary.language_accuracy <= 1.0
    assert summary.mean_latency_per_audio_second >= 0.0
