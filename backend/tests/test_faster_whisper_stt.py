"""
tests/test_faster_whisper_stt.py — Unit tests for local FasterWhisperSTT provider.

All model inference is mocked; runs quickly and reliably in CI and local test suites.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import app
from app.voice.stt.faster_whisper import DEFAULT_LOCAL_VOCAB_PROMPT, FasterWhisperSTT


@pytest.mark.asyncio
async def test_faster_whisper_empty_audio():
    """FasterWhisperSTT rejects empty audio."""
    provider = FasterWhisperSTT()
    with pytest.raises(ValueError, match="empty"):
        await provider.transcribe(audio_bytes=b"")


@pytest.mark.asyncio
async def test_faster_whisper_oversize_audio():
    """FasterWhisperSTT rejects audio exceeding MAX_BYTES."""
    provider = FasterWhisperSTT()
    large_audio = b"\x00" * (provider.MAX_BYTES + 1024)
    with pytest.raises(ValueError, match="exceeds"):
        await provider.transcribe(audio_bytes=large_audio)


@pytest.mark.asyncio
async def test_faster_whisper_transcription_success():
    """FasterWhisperSTT transcribes audio with domain vocabulary prompt and no translation."""
    provider = FasterWhisperSTT(model_name="large-v3-turbo")

    fake_segment_1 = MagicMock(text=" Python-la variable ")
    fake_segment_2 = MagicMock(text=" eppadi use panradhu? ")
    fake_info = MagicMock(language="ta", language_probability=0.98, duration=2.5)

    mock_model = MagicMock()
    mock_model.transcribe.return_value = ([fake_segment_1, fake_segment_2], fake_info)

    with patch("app.voice.stt.faster_whisper.get_whisper_model", return_value=mock_model):
        result = await provider.transcribe(
            audio_bytes=b"RIFF\x00\x00\x00\x00WAVEfmt \x10\x00\x00\x00data\x00\x00",
            mime="audio/wav",
            hint_lang="ta",
        )

        assert result.transcript == "Python-la variable eppadi use panradhu?"
        assert result.language == "ta"
        assert result.duration_s == 2.5

        # Check call arguments
        call_kwargs = mock_model.transcribe.call_args.kwargs
        assert call_kwargs["task"] == "transcribe"
        assert call_kwargs["initial_prompt"] == DEFAULT_LOCAL_VOCAB_PROMPT
        assert call_kwargs["language"] == "ta"


@pytest.mark.asyncio
async def test_endpoint_local_stt_zero_groq_calls(monkeypatch):
    """POST /api/voice/stt uses local FasterWhisperSTT when stt_provider is local; 0 Groq calls."""
    monkeypatch.setattr(get_settings(), "stt_provider", "local")
    monkeypatch.setattr(get_settings(), "groq_api_key", "")  # No Groq key needed

    fake_audio = b"RIFF" + b"\x00" * 40 + b"LOCAL_STT_AUDIO"

    fake_segment = MagicMock(text=" Enaku purinjidhu ")
    fake_info = MagicMock(language="ta", language_probability=0.99, duration=1.8)
    mock_model = MagicMock()
    mock_model.transcribe.return_value = ([fake_segment], fake_info)

    from app.voice.stt.groq_whisper import GroqWhisperSTT

    with patch("app.voice.stt.faster_whisper.get_whisper_model", return_value=mock_model), \
         patch.object(GroqWhisperSTT, "transcribe", new_callable=AsyncMock) as mock_groq_transcribe:

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/voice/stt",
                files={"file": ("recording.wav", fake_audio, "audio/wav")},
                data={"language": "ta"},
            )

            assert resp.status_code == 200
            data = resp.json()
            assert data["transcript"] == "Enaku purinjidhu"
            assert data["language"] == "ta"
            assert data["duration_s"] == 1.8

            # Verify 0 Groq API calls were made!
            assert mock_groq_transcribe.call_count == 0
