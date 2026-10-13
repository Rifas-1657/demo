"""
app/voice/cache.py

Audio cache keyed by sha256(text + voice + speed_str)[:24].
Stores audio bytes + word timings JSON + mime type on local disk (or S3 in prod).
Cache entries never expire (audio for a given text+voice is deterministic).

hit/miss metrics logged per call.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
from pathlib import Path

log = logging.getLogger(__name__)

_DEFAULT_CACHE_DIR = "./audio_cache"
_HIT_COUNT = 0
_MISS_COUNT = 0


def _cache_dir() -> Path:
    from app.config import get_settings
    d = Path(get_settings().audio_cache_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _cache_key(text: str, voice: str, speed: float) -> str:
    raw = f"{text}\0{voice}\0{speed:.3f}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


def cache_get(text: str, voice: str, speed: float) -> tuple[bytes, list[dict], str] | None:
    """Returns (audio_bytes, word_timings, mime) or None on miss."""
    global _HIT_COUNT, _MISS_COUNT
    key = _cache_key(text, voice, speed)
    d = _cache_dir()
    audio_path = d / f"{key}.audio"
    meta_path  = d / f"{key}.json"

    if audio_path.exists() and meta_path.exists():
        _HIT_COUNT += 1
        log.debug("Audio cache HIT key=%s hits=%d misses=%d", key, _HIT_COUNT, _MISS_COUNT)
        audio_bytes = audio_path.read_bytes()
        meta = json.loads(meta_path.read_text())
        return audio_bytes, meta.get("timings", []), meta.get("mime", "audio/mpeg")

    _MISS_COUNT += 1
    log.debug("Audio cache MISS key=%s hits=%d misses=%d", key, _HIT_COUNT, _MISS_COUNT)
    return None


def cache_set(
    text: str,
    voice: str,
    speed: float,
    audio_bytes: bytes,
    word_timings: list[dict],
    mime: str,
) -> None:
    """Write to cache. Silently ignore errors (cache is best-effort)."""
    try:
        key = _cache_key(text, voice, speed)
        d = _cache_dir()
        (d / f"{key}.audio").write_bytes(audio_bytes)
        (d / f"{key}.json").write_text(json.dumps({"timings": word_timings, "mime": mime}))
    except Exception:
        log.warning("Audio cache write failed", exc_info=True)


def cache_stats() -> dict:
    return {"hits": _HIT_COUNT, "misses": _MISS_COUNT,
            "hit_rate": _HIT_COUNT / max(1, _HIT_COUNT + _MISS_COUNT)}
