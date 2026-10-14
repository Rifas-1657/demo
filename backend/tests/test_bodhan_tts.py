"""
tests/test_bodhan_tts.py — Unit tests for Bodhan Indic-Speak TTS provider.

All external HTTP calls are mocked; no real Bodhan API credits are consumed.
"""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.voice.tts.bodhan_tts import BodhanTTSProvider, parse_wav_duration_ms


def test_bodhan_missing_key():
    """BodhanTTSProvider requires an API key."""
    with pytest.raises(ValueError, match="Bodhan API key is required"):
        BodhanTTSProvider(api_key="")


def test_parse_wav_duration_ms():
    """WAV duration parser correctly computes ms from RIFF header or byte length."""
    # 48,000 bytes = 1,000 ms at 24kHz 16-bit mono
    dummy_pcm = b"\x00" * 48000
    duration = parse_wav_duration_ms(dummy_pcm)
    assert duration == 1000


@pytest.mark.asyncio
async def test_bodhan_synthesize_success():
    """BodhanTTSProvider sends compliant JSON and returns TTSResult with WAV audio."""
    mock_wav = b"RIFF" + b"\x00" * 36 + b"data" + b"\x00" * 24000  # ~500ms

    provider = BodhanTTSProvider(
        api_key="mock-bodhan-key",
        model="indic-speak",
        default_voice="Anitha",
        lang="ta",
        style="educational lecture",
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = httpx.Response(200, content=mock_wav)

        result = await provider.synthesize(
            text="Vanakkam! Welcome to Python variables.",
            voice="Anitha",
            speed=1.0,
        )

        assert result.provider == "bodhan"
        assert result.audio_bytes == mock_wav
        assert result.mime_type == "audio/wav"
        assert result.duration_ms > 0
        assert len(result.word_timings) > 0

        # Verify outgoing payload
        call_kwargs = mock_post.call_args.kwargs
        headers = call_kwargs["headers"]
        assert headers["Authorization"] == "Bearer mock-bodhan-key"

        payload = call_kwargs["json"]
        assert payload["model"] == "indic-speak"
        assert payload["voice"] == "Anitha"
        assert "Vanakkam" in payload["input"]

        # instructions must be a valid JSON string
        instructions = json.loads(payload["instructions"])
        assert instructions["lang"] == "ta"
        assert instructions["style"] == "educational lecture"


@pytest.mark.asyncio
async def test_bodhan_rate_limit_retry():
    """BodhanTTSProvider retries on HTTP 429 before succeeding."""
    mock_wav = b"RIFF" + b"\x00" * 36 + b"data" + b"\x00" * 4800

    provider = BodhanTTSProvider(
        api_key="mock-bodhan-key",
        model="indic-speak",
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        # First call returns 429, second returns 200
        mock_post.side_effect = [
            httpx.Response(429, headers={"Retry-After": "1"}, text="Too Many Requests"),
            httpx.Response(200, content=mock_wav),
        ]

        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            result = await provider.synthesize("Testing rate limit retry")
            assert result.audio_bytes == mock_wav
            assert mock_sleep.called
            assert mock_post.call_count == 2
