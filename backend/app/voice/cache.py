"""
app/voice/cache.py — Persistent, atomic audio cache on disk.

Stores audio files (.wav / .audio) and metadata JSON (.json) keyed by SHA-256 hash
of normalized narration text, model, voice, language, style, and speed.

Features:
- Deterministic SHA-256 hashing.
- Atomic file writes using temp file + os.replace to prevent partial writes.
- Asyncio concurrency locks per cache key to prevent duplicate simultaneous API calls.
- Hit/miss metrics logging.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import tempfile
import time
from pathlib import Path

log = logging.getLogger(__name__)

_DEFAULT_CACHE_DIR = "backend/.cache/bookey-voice"
_HIT_COUNT = 0
_MISS_COUNT = 0
_KEY_LOCKS: dict[str, asyncio.Lock] = {}
_GLOBAL_LOCK = asyncio.Lock() if hasattr(asyncio, "Lock") else None


def _cache_dir() -> Path:
    from app.config import get_settings
    raw = getattr(get_settings(), "audio_cache_dir", _DEFAULT_CACHE_DIR)
    p = Path(raw)
    if not p.is_absolute():
        # Handle running from repo root or backend subdir
        cwd = Path.cwd()
        if (cwd / "backend").is_dir() and not raw.startswith("backend"):
            p = cwd / "backend" / raw
        elif cwd.name == "backend" and raw.startswith("backend/"):
            p = cwd / raw.replace("backend/", "", 1)
    p.mkdir(parents=True, exist_ok=True)
    return p


def compute_voice_cache_key(
    text: str,
    model: str = "indic-speak",
    voice: str = "Anitha",
    lang: str = "ta",
    style: str = "educational lecture",
    speed: float = 1.0,
) -> str:
    """Deterministic SHA-256 cache key for TTS speech audio."""
    normalized_text = " ".join(text.strip().split())
    raw = f"{normalized_text}\0{model}\0{voice}\0{lang}\0{style}\0{speed:.3f}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _cache_key(text: str, voice: str, speed: float) -> str:
    """Legacy 24-char cache key for backward compatibility."""
    raw = f"{text}\0{voice}\0{speed:.3f}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def _atomic_write_bytes(target: Path, data: bytes) -> None:
    """Atomically write binary data using a temporary file in the target directory."""
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=target.parent, prefix=".tmp_", suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, target)
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
        raise


def _atomic_write_text(target: Path, text: str) -> None:
    """Atomically write text data using a temporary file in the target directory."""
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=target.parent, prefix=".tmp_", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, target)
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
        raise


async def get_key_lock(key: str) -> asyncio.Lock:
    """Get an asyncio lock for the given cache key to coordinate concurrent synthesis."""
    if key not in _KEY_LOCKS:
        _KEY_LOCKS[key] = asyncio.Lock()
    return _KEY_LOCKS[key]


def get_voice_cache(key: str) -> tuple[bytes, dict] | None:
    """
    Check if a voice entry exists in cache.
    Returns (audio_bytes, metadata_dict) or None if missing.
    """
    global _HIT_COUNT, _MISS_COUNT
    d = _cache_dir()
    wav_path = d / f"{key}.wav"
    audio_path = d / f"{key}.audio"
    meta_path = d / f"{key}.json"

    found_path = wav_path if wav_path.exists() else (audio_path if audio_path.exists() else None)
    if found_path and meta_path.exists():
        try:
            _HIT_COUNT += 1
            audio_bytes = found_path.read_bytes()
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            log.debug("Voice cache HIT key=%s hits=%d misses=%d", key, _HIT_COUNT, _MISS_COUNT)
            return audio_bytes, meta
        except Exception as exc:
            log.warning("Voice cache read error for key=%s: %s", key, exc)

    _MISS_COUNT += 1
    log.debug("Voice cache MISS key=%s hits=%d misses=%d", key, _HIT_COUNT, _MISS_COUNT)
    return None


def set_voice_cache(
    key: str,
    audio_bytes: bytes,
    metadata: dict,
) -> Path:
    """
    Atomically store audio bytes and metadata to cache.
    Returns the Path to the stored audio file.
    """
    d = _cache_dir()
    ext = "wav" if metadata.get("mime_type", "").endswith("wav") else "wav"
    target_audio = d / f"{key}.{ext}"
    target_meta = d / f"{key}.json"

    meta_payload = dict(metadata)
    meta_payload["created_at"] = time.time()
    meta_payload["key"] = key

    _atomic_write_bytes(target_audio, audio_bytes)
    _atomic_write_text(target_meta, json.dumps(meta_payload, indent=2))
    return target_audio


def has_voice_cache(key: str) -> bool:
    """Check if cache file exists without loading bytes into memory."""
    d = _cache_dir()
    return (d / f"{key}.wav").exists() or (d / f"{key}.audio").exists()


# ---------------------------------------------------------------------------
# Legacy API functions (maintained for test & pipeline compatibility)
# ---------------------------------------------------------------------------

def cache_get(text: str, voice: str, speed: float) -> tuple[bytes, list[dict], str] | None:
    """Returns (audio_bytes, word_timings, mime) or None on miss."""
    global _HIT_COUNT, _MISS_COUNT
    key = _cache_key(text, voice, speed)
    d = _cache_dir()
    audio_path = d / f"{key}.audio"
    wav_path = d / f"{key}.wav"
    meta_path = d / f"{key}.json"

    target_audio = audio_path if audio_path.exists() else (wav_path if wav_path.exists() else None)
    if target_audio and meta_path.exists():
        _HIT_COUNT += 1
        log.debug("Audio cache HIT key=%s hits=%d misses=%d", key, _HIT_COUNT, _MISS_COUNT)
        audio_bytes = target_audio.read_bytes()
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        return audio_bytes, meta.get("timings", []), meta.get("mime", meta.get("mime_type", "audio/wav"))

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
    """Write to cache with atomic writes."""
    try:
        key = _cache_key(text, voice, speed)
        d = _cache_dir()
        audio_target = d / f"{key}.audio"
        meta_target = d / f"{key}.json"
        _atomic_write_bytes(audio_target, audio_bytes)
        _atomic_write_text(meta_target, json.dumps({"timings": word_timings, "mime": mime, "key": key}))
    except Exception:
        log.warning("Audio cache write failed", exc_info=True)


def cache_stats() -> dict:
    return {
        "hits": _HIT_COUNT,
        "misses": _MISS_COUNT,
        "hit_rate": _HIT_COUNT / max(1, _HIT_COUNT + _MISS_COUNT),
    }
