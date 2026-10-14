"""
tests/test_voice_api.py — Unit and integration tests for TTS & STT voice endpoints.

All provider calls are mocked; no real API quota or live credentials are consumed.
"""
from __future__ import annotations

import base64
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def mock_gemini(tmp_path, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "audio_cache_dir", str(tmp_path))
    monkeypatch.setattr(get_settings(), "tts_provider", "gemini")
    with patch("app.voice.tts.gemini_tts.httpx.AsyncClient") as mock_cls:
        client = AsyncMock()
        mock_cls.return_value.__aenter__.return_value = client
        yield client


@pytest.fixture
def mock_groq(monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "stt_provider", "groq")
    with patch("app.voice.stt.groq_whisper.httpx.AsyncClient") as mock_cls:
        client = AsyncMock()
        mock_cls.return_value.__aenter__.return_value = client
        yield client


# ---------------------------------------------------------------------------
# TTS: Text-to-Speech Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_tts_success(monkeypatch, mock_gemini):
    """POST /api/voice/tts successfully returns audio bytes with correct MIME type."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "gemini_api_key", "mock-gemini-key")

    mock_wav_bytes = b"RIFF" + b"\x00" * 40 + b"FAKE_AUDIO_DATA"

    mock_gemini.post.return_value = httpx.Response(
        200,
        json={
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "inlineData": {
                                    "mimeType": "audio/wav",
                                    "data": base64.b64encode(mock_wav_bytes).decode("ascii"),
                                }
                            }
                        ]
                    }
                }
            ]
        },
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/tts",
            json={"text": "Welcome to Python variables and data types", "speed": 1.0},
        )

        assert resp.status_code == 200
        assert resp.headers["content-type"] == "audio/wav"
        assert resp.content == mock_wav_bytes

        # Regression: Gemini payload text must only be the normalized content, without prompt prefix leaking
        call_kwargs = mock_gemini.post.call_args.kwargs
        sent_json = call_kwargs["json"]
        sent_text = sent_json["contents"][0]["parts"][0]["text"]
        assert sent_text == "Welcome to Python variables and data types"
        assert "style" not in sent_text.lower()


@pytest.mark.asyncio
async def test_tts_json_format(monkeypatch, mock_gemini):
    """POST /api/voice/tts?format=json returns base64 audio and metadata."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "gemini_api_key", "mock-gemini-key")

    mock_wav_bytes = b"RIFF" + b"\x00" * 40 + b"FAKE_AUDIO_DATA"

    mock_gemini.post.return_value = httpx.Response(
        200,
        json={
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "inlineData": {
                                    "mimeType": "audio/wav",
                                    "data": base64.b64encode(mock_wav_bytes).decode("ascii"),
                                }
                            }
                        ]
                    }
                }
            ]
        },
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/tts?format=json",
            json={"text": "Hello learner"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert "audio_base64" in data
        assert data["mime_type"] == "audio/wav"
        assert base64.b64decode(data["audio_base64"]) == mock_wav_bytes


@pytest.mark.asyncio
async def test_tts_empty_and_oversize_text():
    """Empty and oversized texts are rejected."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Empty text
        resp_empty = await client.post("/api/voice/tts", json={"text": ""})
        assert resp_empty.status_code == 422

        # Whitespace-only text
        resp_ws = await client.post("/api/voice/tts", json={"text": "   "})
        assert resp_ws.status_code in (400, 422)

        # Oversized text (> 5000 chars)
        resp_large = await client.post("/api/voice/tts", json={"text": "A" * 5001})
        assert resp_large.status_code == 422


@pytest.mark.asyncio
async def test_tts_missing_api_key(monkeypatch):
    """Missing Gemini API key returns 503 Service Unavailable."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "gemini_api_key", "")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/tts",
            json={"text": "This should fail due to missing key"},
        )
        assert resp.status_code == 503
        assert "not configured" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_tts_provider_timeout(monkeypatch, mock_gemini):
    """TTS provider timeout returns 504 Gateway Timeout."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "gemini_api_key", "mock-gemini-key")

    mock_gemini.post.side_effect = httpx.TimeoutException("Request timed out")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/voice/tts", json={"text": "Timeout test"})
        assert resp.status_code == 504
        assert "timed out" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_tts_provider_rate_limit(monkeypatch, mock_gemini):
    """TTS provider 429 returns 429 Too Many Requests."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "gemini_api_key", "mock-gemini-key")

    mock_gemini.post.return_value = httpx.Response(429, text="Quota exceeded")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/voice/tts", json={"text": "Rate limit test"})
        assert resp.status_code == 429
        assert "rate limit" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_tts_provider_upstream_error(monkeypatch, mock_gemini):
    """TTS upstream 500 error returns 502 Bad Gateway without leaking secret keys."""
    from app.config import get_settings
    secret_key = "super-secret-key-12345"
    monkeypatch.setattr(get_settings(), "gemini_api_key", secret_key)

    mock_gemini.post.return_value = httpx.Response(500, text=f"Internal server error with key={secret_key}")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/voice/tts", json={"text": "Server error test"})
        assert resp.status_code == 502
        # Verify secret key is NOT leaked in the response detail
        assert secret_key not in resp.text


# ---------------------------------------------------------------------------
# STT: Speech-to-Text Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stt_success(monkeypatch, mock_groq):
    """POST /api/voice/stt transcribes uploaded audio with Groq Whisper."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "groq_api_key", "mock-groq-key")

    fake_audio = b"\x1a\x45\xdf\xa3" + b"\x00" * 50  # mock webm header bytes

    mock_groq.post.return_value = httpx.Response(
        200,
        json={
            "text": "Python-la dictionary eppadi use panradhu?",
            "language": "ta",
            "duration": 3.2,
        },
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/stt",
            files={"file": ("recording.webm", fake_audio, "audio/webm")},
            data={"language": "ta"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["transcript"] == "Python-la dictionary eppadi use panradhu?"
        assert data["language"] == "ta"
        assert data["duration_s"] == 3.2


@pytest.mark.asyncio
async def test_stt_empty_audio(monkeypatch):
    """Empty audio file returns 400 Bad Request."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "groq_api_key", "mock-groq-key")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/stt",
            files={"file": ("empty.webm", b"", "audio/webm")},
        )
        assert resp.status_code == 400
        assert "empty" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_stt_unsupported_format(monkeypatch):
    """Unsupported format returns 415 Unsupported Media Type."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "groq_api_key", "mock-groq-key")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/stt",
            files={"file": ("document.pdf", b"%PDF-1.4...", "application/pdf")},
        )
        assert resp.status_code == 415
        assert "unsupported" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_stt_oversize_audio(monkeypatch):
    """Audio exceeding 10MB limit returns 413 Payload Too Large."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "groq_api_key", "mock-groq-key")

    large_audio = b"\x00" * (11 * 1024 * 1024)  # 11MB

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/stt",
            files={"file": ("large.wav", large_audio, "audio/wav")},
        )
        assert resp.status_code == 413
        assert "limit" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_stt_missing_api_key(monkeypatch):
    """Missing Groq API key returns 503 Service Unavailable."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "stt_provider", "groq")
    monkeypatch.setattr(get_settings(), "groq_api_key", "")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/stt",
            files={"file": ("audio.wav", b"fake-wav-bytes", "audio/wav")},
        )
        assert resp.status_code == 503
        assert "not configured" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_stt_provider_rate_limit(monkeypatch, mock_groq):
    """Groq Whisper 429 returns 429 Too Many Requests."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "groq_api_key", "mock-groq-key")

    mock_groq.post.return_value = httpx.Response(429, text="Rate limit reached")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/stt",
            files={"file": ("audio.wav", b"fake-wav-bytes", "audio/wav")},
        )
        assert resp.status_code == 429


@pytest.mark.asyncio
async def test_stt_provider_timeout(monkeypatch, mock_groq):
    """STT provider timeout returns 504 Gateway Timeout."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "groq_api_key", "mock-groq-key")

    mock_groq.post.side_effect = httpx.TimeoutException("Connection timeout")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/voice/stt",
            files={"file": ("audio.wav", b"fake-wav-bytes", "audio/wav")},
        )
        assert resp.status_code == 504


@pytest.mark.asyncio
async def test_stt_vocab_hint_included(monkeypatch, mock_groq):
    """Tanglish technical vocabulary hint is passed to Groq Whisper."""
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "groq_api_key", "mock-groq-key")

    mock_groq.post.return_value = httpx.Response(
        200,
        json={"text": "StateGraph code", "language": "ta", "duration": 1.5},
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/api/voice/stt",
            files={"file": ("recording.webm", b"dummy-data", "audio/webm")},
        )

        assert mock_groq.post.called
        call_kwargs = mock_groq.post.call_args[1]
        data = call_kwargs.get("data", {})
        prompt = data.get("prompt", "")
        assert "React" in prompt
        assert "FastAPI" in prompt
        assert "LangGraph" in prompt
        assert "StateGraph" in prompt
