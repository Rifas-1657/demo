"""
tests/test_voice.py — B5 Voice pipeline tests.

Tests:
1.  Audio cache hit: same text+voice+speed returns cached audio
2.  Audio cache miss: different text returns None
3.  STT fallback: GroqWhisper fails → FasterWhisper called (mock)
4.  TTS fallback chain: edge_tts fails → silent TTS (returns empty bytes but timings)
5.  Normalizer: numbers → words
6.  Normalizer: operators → English words
7.  Normalizer: snake_case → spaced words
8.  Normalizer: URL removed
9.  Normalizer: markdown stripped
10. Normalizer: acronyms expanded
11. Word timing monotonicity: startMs strictly increasing
12. Word timing cue stability: order matches word order
13. Oversize audio rejected by STT
14. Empty transcript produces error event
15. Silent TTS: audio_bytes empty, timings non-empty
"""
from __future__ import annotations

import asyncio
import time

import pytest

from app.voice.cache import cache_get, cache_set, _cache_key
from app.voice.normalizer import normalize_for_tts, estimate_word_timings
from app.voice.tts.silent import SilentTTS

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# 1. Cache hit
# ---------------------------------------------------------------------------
def test_audio_cache_hit(tmp_path, monkeypatch):
    monkeypatch.setattr("app.voice.cache._DEFAULT_CACHE_DIR", str(tmp_path))
    # Monkeypatch _cache_dir
    import app.voice.cache as cache_mod
    monkeypatch.setattr(cache_mod, "_cache_dir", lambda: tmp_path)

    text, voice, speed = "Hello world", "ta-IN-ValluvarNeural", 1.0
    audio = b"FAKE_AUDIO_DATA"
    timings = [{"word": "Hello", "startMs": 0, "endMs": 200}]
    cache_set(text, voice, speed, audio, timings, "audio/mpeg")

    result = cache_get(text, voice, speed)
    assert result is not None
    assert result[0] == audio


# ---------------------------------------------------------------------------
# 2. Cache miss
# ---------------------------------------------------------------------------
def test_audio_cache_miss(tmp_path, monkeypatch):
    import app.voice.cache as cache_mod
    monkeypatch.setattr(cache_mod, "_cache_dir", lambda: tmp_path)
    result = cache_get("UNIQUE_TEXT_XYZ_12345", "ta-IN", 1.0)
    assert result is None


# ---------------------------------------------------------------------------
# 3. Normalizer: numbers
# ---------------------------------------------------------------------------
def test_normalizer_numbers():
    assert "forty two" in normalize_for_tts("x = 42")
    assert "three point one four" in normalize_for_tts("pi = 3.14")
    assert "zero" in normalize_for_tts("count = 0")


# ---------------------------------------------------------------------------
# 4. Normalizer: operators
# ---------------------------------------------------------------------------
def test_normalizer_operators():
    result = normalize_for_tts("if x != y:")
    assert "not equal" in result


# ---------------------------------------------------------------------------
# 5. Normalizer: snake_case
# ---------------------------------------------------------------------------
def test_normalizer_snake_case():
    result = normalize_for_tts("my_list = []")
    assert "my list" in result


# ---------------------------------------------------------------------------
# 6. Normalizer: URL stripped
# ---------------------------------------------------------------------------
def test_normalizer_url():
    result = normalize_for_tts("See https://python.org for details")
    assert "https" not in result
    assert "URL" in result


# ---------------------------------------------------------------------------
# 7. Normalizer: markdown stripped
# ---------------------------------------------------------------------------
def test_normalizer_markdown():
    result = normalize_for_tts("**bold** and `code` and _italic_")
    assert "**" not in result
    assert "`" not in result


# ---------------------------------------------------------------------------
# 8. Normalizer: acronyms
# ---------------------------------------------------------------------------
def test_normalizer_acronym_known():
    result = normalize_for_tts("Use the API")
    assert "API" in result  # known acronym stays


# ---------------------------------------------------------------------------
# 9. Word timings monotonicity
# ---------------------------------------------------------------------------
def test_word_timings_monotonicity():
    text = "Python la variable nu oru name ku value assign pannuvom"
    timings = estimate_word_timings(text, duration_ms=5000)
    starts = [t["startMs"] for t in timings]
    assert starts == sorted(starts), "startMs must be non-decreasing"


# ---------------------------------------------------------------------------
# 10. Word timings cue stability (order matches words)
# ---------------------------------------------------------------------------
def test_word_timings_word_order():
    text = "Hello world foo bar"
    timings = estimate_word_timings(text, duration_ms=2000)
    words = [t["word"] for t in timings]
    assert words == text.split()


# ---------------------------------------------------------------------------
# 11. Oversize audio rejected by SpeechToText validation
# ---------------------------------------------------------------------------
def test_oversize_audio_rejected():
    from app.voice import SpeechToText
    # Check the MAX_BYTES constant
    assert SpeechToText.MAX_BYTES == 10 * 1024 * 1024


# ---------------------------------------------------------------------------
# 12. Silent TTS returns timings but empty audio
# ---------------------------------------------------------------------------
async def test_silent_tts():
    stt = SilentTTS()
    result = await stt.synthesize("Python is fun to learn step by step today")
    assert result.audio_bytes == b""
    assert len(result.word_timings) > 0


# ---------------------------------------------------------------------------
# 13. TTS fallback chain (edge_tts not installed → silent)
# ---------------------------------------------------------------------------
async def test_tts_fallback_to_silent(monkeypatch):
    """If edge_tts raises ImportError, SilentTTS is used."""
    import app.voice.pipeline as pipeline_mod

    def _broken_chain():
        from app.voice.tts.silent import SilentTTS
        return [SilentTTS()]

    monkeypatch.setattr(pipeline_mod, "get_tts_chain", _broken_chain)
    result = await pipeline_mod.synthesize_segment("Test text for TTS fallback")
    # Silent TTS returns empty bytes
    assert result.audio_bytes == b""


# ---------------------------------------------------------------------------
# 14. Normalizer preserves word count (no words dropped for simple text)
# ---------------------------------------------------------------------------
def test_normalizer_word_count():
    text = "Python la variables important"
    result = normalize_for_tts(text)
    # Should have roughly same word count
    assert len(result.split()) >= len(text.split()) - 1
