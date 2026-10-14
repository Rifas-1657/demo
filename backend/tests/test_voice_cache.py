"""
tests/test_voice_cache.py — Unit and integration tests for persistent audio caching.

Verifies:
1. Deterministic SHA-256 cache key generation.
2. Atomic disk storage and retrieval of audio bytes + JSON metadata.
3. Cache HIT returns cached WAV with header X-Cache: HIT and zero provider calls.
4. Cache MISS synthesizes, writes to cache, and returns X-Cache: MISS.
"""
from __future__ import annotations

import os
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import app
from app.voice import TTSResult, WordTiming
from app.voice.cache import (
    compute_voice_cache_key,
    get_voice_cache,
    has_voice_cache,
    set_voice_cache,
)
from app.voice.tts.bodhan_tts import BodhanTTSProvider


def test_cache_key_determinism():
    """Identical text with different whitespace yields identical cache key."""
    k1 = compute_voice_cache_key("  Hello   world!  ", model="indic-speak", voice="Anitha")
    k2 = compute_voice_cache_key("Hello world!", model="indic-speak", voice="Anitha")
    assert k1 == k2

    # Different voice yields different key
    k3 = compute_voice_cache_key("Hello world!", model="indic-speak", voice="DifferentVoice")
    assert k1 != k3


def test_set_and_get_voice_cache(tmp_path, monkeypatch):
    """Writing to cache persists audio and metadata files atomically."""
    monkeypatch.setattr(get_settings(), "audio_cache_dir", str(tmp_path))

    key = "test_key_123456789"
    audio_data = b"RIFF\x00\x00\x00\x00WAVEfmt \x10\x00\x00\x00data"
    meta = {
        "text": "Hello learner",
        "model": "indic-speak",
        "voice": "Anitha",
        "duration_ms": 1200,
        "mime_type": "audio/wav",
    }

    assert not has_voice_cache(key)
    path = set_voice_cache(key, audio_data, meta)
    assert path.exists()
    assert has_voice_cache(key)

    retrieved = get_voice_cache(key)
    assert retrieved is not None
    cached_bytes, cached_meta = retrieved
    assert cached_bytes == audio_data
    assert cached_meta["text"] == "Hello learner"
    assert cached_meta["duration_ms"] == 1200


@pytest.mark.asyncio
async def test_endpoint_cache_hit_zero_api_calls(tmp_path, monkeypatch):
    """POST /api/voice/tts returns cached audio with X-Cache: HIT and zero provider calls."""
    monkeypatch.setattr(get_settings(), "audio_cache_dir", str(tmp_path))
    monkeypatch.setattr(get_settings(), "tts_provider", "bodhan")
    monkeypatch.setattr(get_settings(), "bodhan_api_key", "mock-bodhan-key")

    from app.voice.normalizer import normalize_for_tts
    text = "Vanakkam Python lesson page 1"
    cleaned_text = normalize_for_tts(text).strip()
    key = compute_voice_cache_key(
        text=cleaned_text,
        model=get_settings().bodhan_tts_model,
        voice=get_settings().bodhan_tts_voice,
        lang=get_settings().bodhan_tts_lang,
        style=get_settings().bodhan_tts_style,
        speed=1.0,
    )

    cached_audio = b"RIFF" + b"\x00" * 36 + b"CACHED_AUDIO_BYTES"
    set_voice_cache(
        key=key,
        audio_bytes=cached_audio,
        metadata={
            "text": text,
            "duration_ms": 2500,
            "mime_type": "audio/wav",
        },
    )

    # Patch Bodhan synthesize method to verify it is NEVER called on cache hit
    with patch.object(BodhanTTSProvider, "synthesize", new_callable=AsyncMock) as mock_synth:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/voice/tts",
                json={"text": text, "speed": 1.0},
            )

            assert resp.status_code == 200
            assert resp.headers["x-cache"] == "HIT"
            assert resp.content == cached_audio
            # Verify 0 external API calls were made!
            assert mock_synth.call_count == 0


@pytest.mark.asyncio
async def test_endpoint_cache_miss_synthesizes_and_caches(tmp_path, monkeypatch):
    """POST /api/voice/tts on cache miss synthesizes, returns X-Cache: MISS, and stores to cache."""
    monkeypatch.setattr(get_settings(), "audio_cache_dir", str(tmp_path))
    monkeypatch.setattr(get_settings(), "tts_provider", "bodhan")
    monkeypatch.setattr(get_settings(), "bodhan_api_key", "mock-bodhan-key")

    text = "Brand new uncached narration sentence"
    key = compute_voice_cache_key(
        text=text,
        model=get_settings().bodhan_tts_model,
        voice=get_settings().bodhan_tts_voice,
        lang=get_settings().bodhan_tts_lang,
        style=get_settings().bodhan_tts_style,
        speed=1.0,
    )

    assert not has_voice_cache(key)

    fresh_audio = b"RIFF" + b"\x00" * 36 + b"FRESH_SYNTHESIS_AUDIO"
    mock_result = TTSResult(
        audio_bytes=fresh_audio,
        mime_type="audio/wav",
        word_timings=[WordTiming(word="Brand", start_ms=0, end_ms=150)],
        duration_ms=1200,
        provider="bodhan",
        from_cache=False,
    )

    with patch.object(BodhanTTSProvider, "synthesize", new_callable=AsyncMock) as mock_synth:
        mock_synth.return_value = mock_result

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # 1. First call: MISS
            resp1 = await client.post(
                "/api/voice/tts",
                json={"text": text, "speed": 1.0},
            )

            assert resp1.status_code == 200
            assert resp1.headers["x-cache"] == "MISS"
            assert resp1.content == fresh_audio
            assert mock_synth.call_count == 1
            assert has_voice_cache(key)

            # 2. Second call: HIT (0 additional provider calls!)
            resp2 = await client.post(
                "/api/voice/tts",
                json={"text": text, "speed": 1.0},
            )

            assert resp2.status_code == 200
            assert resp2.headers["x-cache"] == "HIT"
            assert resp2.content == fresh_audio
            # Call count remains 1!
            assert mock_synth.call_count == 1
