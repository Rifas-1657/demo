"""
app/voice/warmup.py — Controlled cache warmup CLI script for lesson narration.

Pre-generates and caches lesson narration audio so that playback in the demo
runs with zero API calls and zero latency.

Usage:
  # Check status without generating (dry-run):
  python -m app.voice.warmup --course python --dry-run

  # Generate up to 10 uncached segments (batch limit):
  python -m app.voice.warmup --course python --execute --limit 10

Options:
  --course: Course identifier (default: "python")
  --limit: Maximum number of uncached segments to generate in this run (default: 10)
  --dry-run: Report cache status without calling external APIs (default)
  --execute: Generate audio for uncached segments up to --limit
  --voice: Voice name override (default from settings)
  --lang: Language code (default from settings)
  --style: Style instruction (default from settings)
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import re
import sys
import time
from typing import List

from app.config import get_settings
from app.db.seed import PYTHON_PAGES
from app.voice.cache import (
    compute_voice_cache_key,
    get_voice_cache,
    has_voice_cache,
    set_voice_cache,
)
from app.voice.normalizer import normalize_for_tts
from app.voice.tts.bodhan_tts import BodhanTTSProvider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("warmup")

SENTENCE_END_RE = re.compile(r'[.!?]["\')\]]?$')


def split_narration_into_sentences(text: str) -> List[str]:
    """
    Split narration text into sentences using the exact same logic
    as the frontend's tokenizeNarration function.
    """
    tokens = text.split()
    sentences = []
    start = 0
    for i, token in enumerate(tokens):
        is_last = i == len(tokens) - 1
        if SENTENCE_END_RE.search(token) or is_last:
            sentence = " ".join(tokens[start : i + 1])
            if sentence.strip():
                sentences.append(sentence.strip())
            start = i + 1
    return sentences


def get_course_sentences(course_id: str) -> List[dict]:
    """Retrieve all unique narration sentences for a course."""
    if course_id.lower() != "python":
        raise ValueError(f"Course '{course_id}' not found. Available courses: python")

    segments = []
    seen = set()

    for page in PYTHON_PAGES:
        page_id = page["id"]
        narration = page.get("narration_text", "")
        if not narration:
            continue

        page_sentences = split_narration_into_sentences(narration)
        for s_idx, sentence in enumerate(page_sentences):
            clean_s = sentence.strip()
            if not clean_s or clean_s in seen:
                continue
            seen.add(clean_s)
            segments.append({
                "page_id": page_id,
                "sentence_index": s_idx,
                "text": clean_s,
            })

    return segments


async def run_warmup(
    course: str = "python",
    limit: int = 10,
    execute: bool = False,
    voice_override: str = "",
    lang_override: str = "",
    style_override: str = "",
) -> int:
    settings = get_settings()

    model = settings.bodhan_tts_model
    voice = voice_override or settings.bodhan_tts_voice
    lang = lang_override or settings.bodhan_tts_lang
    style = style_override or settings.bodhan_tts_style
    speed = 1.0

    print("=" * 65)
    print("BOOKEY VOICE CACHE WARMUP")
    print("=" * 65)
    print(f"Course:    {course}")
    print(f"TTS Model: {model}")
    print(f"Voice:     {voice}")
    print(f"Language:  {lang}")
    print(f"Style:     {style}")
    print(f"Mode:      {'EXECUTE' if execute else 'DRY RUN (no API calls)'}")
    print(f"Limit:     {limit}")
    print("-" * 65)

    try:
        segments = get_course_sentences(course)
    except Exception as exc:
        print(f"Error loading course sentences: {exc}", file=sys.stderr)
        return 1

    total_segments = len(segments)
    cached_count = 0
    uncached_segments = []

    for seg in segments:
        clean_text = normalize_for_tts(seg["text"]).strip()
        key = compute_voice_cache_key(
            text=clean_text,
            model=model,
            voice=voice,
            lang=lang,
            style=style,
            speed=speed,
        )
        if has_voice_cache(key):
            cached_count += 1
        else:
            uncached_segments.append({**seg, "normalized": clean_text, "key": key})

    pct_cached = (cached_count / total_segments * 100) if total_segments else 0
    print(f"Total Unique Sentences: {total_segments}")
    print(f"Already Cached:         {cached_count} ({pct_cached:.1f}%)")
    print(f"Uncached:               {len(uncached_segments)}")
    print("-" * 65)

    if not execute:
        print("[DRY RUN] Status report complete. No external requests were made.")
        if uncached_segments:
            print(f"Next batch would process up to {min(limit, len(uncached_segments))} sentences.")
            print("To generate audio and populate cache, re-run with --execute flag:")
            print(f"  python -m app.voice.warmup --course {course} --execute --limit {limit}")
        else:
            print("All narration segments are already cached! Replay is 100% offline.")
        print("=" * 65)
        return 0

    # Execute mode: Verify API key
    if not settings.bodhan_api_key:
        print(
            "ERROR: BODHAN_API_KEY is not configured in backend/.env. Cannot generate audio.",
            file=sys.stderr,
        )
        return 1

    provider = BodhanTTSProvider(
        api_key=settings.bodhan_api_key,
        model=model,
        default_voice=voice,
        lang=lang,
        style=style,
    )

    batch_to_process = uncached_segments[:limit]
    print(f"[EXECUTE] Starting batch synthesis for {len(batch_to_process)} sentences...")

    generated = 0
    failed = 0

    for idx, item in enumerate(batch_to_process, start=1):
        text_preview = item["normalized"][:45] + ("..." if len(item["normalized"]) > 45 else "")
        print(f"[{idx}/{len(batch_to_process)}] Synthesizing: \"{text_preview}\" ... ", end="", flush=True)

        try:
            t0 = time.monotonic()
            result = await provider.synthesize(item["normalized"], voice=voice, speed=speed)
            duration_s = (time.monotonic() - t0)

            # Store to persistent cache
            set_voice_cache(
                key=item["key"],
                audio_bytes=result.audio_bytes,
                metadata={
                    "text": item["normalized"],
                    "model": model,
                    "voice": voice,
                    "lang": lang,
                    "style": style,
                    "speed": speed,
                    "duration_ms": result.duration_ms,
                    "mime_type": result.mime_type,
                    "timings": [
                        {"word": wt.word, "startMs": wt.start_ms, "endMs": wt.end_ms}
                        for wt in result.word_timings
                    ],
                },
            )
            generated += 1
            print(f"OK ({len(result.audio_bytes)} bytes, {result.duration_ms}ms audio, {duration_s:.1f}s latency)")

            # Gentle pause between requests to prevent hitting provider rate limits
            if idx < len(batch_to_process):
                await asyncio.sleep(0.5)

        except Exception as exc:
            failed += 1
            print(f"FAILED: {exc}")
            # If rate limit reached, stop batch gracefully
            if "429" in str(exc) or "rate limit" in str(exc).lower():
                print("Provider rate limit reached. Halting current batch.")
                break

    print("-" * 65)
    print(f"Warmup Complete. Generated: {generated}, Failed: {failed}")
    new_cached = cached_count + generated
    new_pct = (new_cached / total_segments * 100) if total_segments else 0
    print(f"New Cache Status: {new_cached}/{total_segments} sentences ({new_pct:.1f}%)")
    print("=" * 65)
    return 0 if failed == 0 else 1


def main():
    parser = argparse.ArgumentParser(description="Bookey Lesson Narration Voice Cache Warmup")
    parser.add_argument("--course", default="python", help="Course ID (default: python)")
    parser.add_argument("--limit", type=int, default=10, help="Batch limit for uncached synthesis (default: 10)")
    parser.add_argument("--execute", action="store_true", help="Execute synthesis (calls external API)")
    parser.add_argument("--dry-run", action="store_true", help="Dry run only (no API calls, default)")
    parser.add_argument("--voice", default="", help="Voice override")
    parser.add_argument("--lang", default="", help="Language override")
    parser.add_argument("--style", default="", help="Style override")

    args = parser.parse_args()
    execute = args.execute and not args.dry_run

    code = asyncio.run(
        run_warmup(
            course=args.course,
            limit=args.limit,
            execute=execute,
            voice_override=args.voice,
            lang_override=args.lang,
            style_override=args.style,
        )
    )
    sys.exit(code)


if __name__ == "__main__":
    main()
