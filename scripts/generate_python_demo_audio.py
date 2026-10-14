#!/usr/bin/env python3
"""
scripts/generate_python_demo_audio.py

Prebuilds and permanently stores narration audio for the 8 Python-book demo pages
using ElevenLabs Eleven v4 and the user's selected account voice:
  Roger - Laid-Back, Casual, Resonant (voice_id: CwhRBWXzGAHq8TQ4Fs17).

Safety rules:
- Never prints, logs, or exposes the ElevenLabs API key.
- Strict credit budget: min(9,000, current_balance - 900).
- Validates preflight model availability, voice ID, and credit balance.
- Outputs dry-run report before any generation.
- Generates only missing files atomically.
- Produces public/audio/python-demo/manifest.json with metadata and hashes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.error

# Workspace paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
ENV_PATH = BACKEND_DIR / ".env"
BOOK_PAGES_PATH = PROJECT_ROOT / "lib" / "mock" / "book-pages.ts"
OUTPUT_DIR = PROJECT_ROOT / "public" / "audio" / "python-demo"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"

# ElevenLabs parameters
TARGET_MODEL_ID = "eleven_v4"
TARGET_VOICE_ID = "CwhRBWXzGAHq8TQ4Fs17"
TARGET_VOICE_NAME_KEYWORD = "Roger"
TARGET_OUTPUT_FORMAT = "mp3_44100_128"
RESERVE_CREDITS = 900
HARD_BUDGET_CAP = 9000

# The 8 Python demo pages in visible reading order
PYTHON_8_PAGES = [
    {"order": 1, "file_name": "page-01.mp3", "page_id": "lesson_python_1_1", "chapter": 1, "page": 1, "title": "What is a variable?", "narration_var": "narration1_1"},
    {"order": 2, "file_name": "page-02.mp3", "page_id": "lesson_python_1_2", "chapter": 1, "page": 2, "title": "Assigning variables", "narration_var": "narration1_2"},
    {"order": 3, "file_name": "page-03.mp3", "page_id": "lesson_python_1_3", "chapter": 1, "page": 3, "title": "Data types", "narration_var": "narration1_3"},
    {"order": 4, "file_name": "page-04.mp3", "page_id": "lesson_python_1_4", "chapter": 1, "page": 4, "title": "Naming rules", "narration_var": "narration1_4"},
    {"order": 5, "file_name": "page-05.mp3", "page_id": "lesson_python_1_5", "chapter": 1, "page": 5, "title": "input() and print()", "narration_var": "narration1_5"},
    {"order": 6, "file_name": "page-06.mp3", "page_id": "lesson_python_1_6", "chapter": 1, "page": 6, "title": "Mini practice", "narration_var": "narration1_6"},
    {"order": 7, "file_name": "page-07.mp3", "page_id": "lesson_python_2_1", "chapter": 2, "page": 1, "title": "Numbers: int and float", "narration_var": "narration2_1"},
    {"order": 8, "file_name": "page-08.mp3", "page_id": "lesson_python_2_2", "chapter": 2, "page": 2, "title": "Strings: working with text", "narration_var": "narration2_2"},
]


def load_api_key() -> str:
    """Load ELEVENLABS_API_KEY from environment or backend/.env without exposing."""
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if api_key:
        return api_key

    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("ELEVENLABS_API_KEY="):
                    val = line.split("=", 1)[1].strip()
                    val = val.strip("'\"")
                    if val:
                        return val

    raise ValueError("ELEVENLABS_API_KEY not found in environment or backend/.env")


def api_request(endpoint: str, api_key: str, method: str = "GET", data: Optional[bytes] = None) -> Any:
    """Execute an ElevenLabs API request safely."""
    url = f"https://api.elevenlabs.io{endpoint}"
    headers = {
        "xi-api-key": api_key,
        "User-Agent": "Bookey-Audio-Prebuilder/1.0",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "application/json" in content_type:
                return json.loads(resp.read().decode("utf-8"))
            return resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ElevenLabs API error (HTTP {e.code}): {err_body}")
    except Exception as e:
        raise RuntimeError(f"Network error calling {endpoint}: {e}")


def get_subscription_info(api_key: str) -> Dict[str, Any]:
    """Fetch user subscription details to verify credit balance."""
    data = api_request("/v1/user/subscription", api_key)
    tier = data.get("tier", "unknown")
    limit = data.get("character_limit", 0)
    used = data.get("character_count", 0)
    remaining = max(0, limit - used)
    return {
        "tier": tier,
        "character_limit": limit,
        "character_count": used,
        "remaining_credits": remaining,
    }


def verify_model_and_voice(api_key: str) -> Dict[str, str]:
    """Verify eleven_v4 model and Roger voice availability."""
    models_data = api_request("/v1/models", api_key)
    models = models_data if isinstance(models_data, list) else models_data.get("models", [])
    model_ids = [m.get("model_id") for m in models if isinstance(m, dict)]
    if TARGET_MODEL_ID not in model_ids:
        raise RuntimeError(f"Model '{TARGET_MODEL_ID}' is not available for this account. Available: {model_ids}")

    voices_data = api_request("/v1/voices", api_key)
    voices = voices_data if isinstance(voices_data, list) else voices_data.get("voices", [])
    matched_voice = None
    for v in voices:
        if v.get("voice_id") == TARGET_VOICE_ID:
            matched_voice = v
            break

    if not matched_voice:
        raise RuntimeError(f"Voice ID '{TARGET_VOICE_ID}' not found in account voices. Cannot proceed.")

    voice_name = matched_voice.get("name", "")
    if TARGET_VOICE_NAME_KEYWORD.lower() not in voice_name.lower():
        raise RuntimeError(f"Voice ID '{TARGET_VOICE_ID}' is '{voice_name}', expected '{TARGET_VOICE_NAME_KEYWORD}'.")

    return {
        "model_id": TARGET_MODEL_ID,
        "voice_id": TARGET_VOICE_ID,
        "voice_name": voice_name,
    }


def extract_narrations() -> Dict[str, str]:
    """Extract narrations from lib/mock/book-pages.ts."""
    if not BOOK_PAGES_PATH.exists():
        raise FileNotFoundError(f"Cannot find book pages at {BOOK_PAGES_PATH}")

    with open(BOOK_PAGES_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    narrations = {}
    for m in re.finditer(r'const (narration\d+_\d+)\s*=\s*`([^`]+)`', content):
        narrations[m.group(1)] = m.group(2).strip()

    return narrations


def get_audio_duration_seconds(file_path: Path) -> float:
    """Measure exact duration of an MP3 file via ffmpeg or CBR fallback."""
    # Attempt ffmpeg if present
    try:
        res = subprocess.run(
            ["ffmpeg", "-i", str(file_path)],
            stderr=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            timeout=10,
        )
        # Look for Duration: 00:01:23.45
        m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", res.stderr)
        if m:
            hours = int(m.group(1))
            minutes = int(m.group(2))
            seconds = float(m.group(3))
            return round(hours * 3600 + minutes * 60 + seconds, 2)
    except Exception:
        pass

    # Fallback: CBR calculation for mp3_44100_128 (128 kbps = 16,000 bytes/sec)
    size_bytes = file_path.stat().st_size
    return round(size_bytes / 16000.0, 2)


def run_dry_run() -> None:
    """Perform preflight checks and output formatted dry-run report."""
    print("=" * 75)
    print("BOOKEY — ELEVENLABS ELEVEN V4 PREFLIGHT & DRY-RUN AUDIT")
    print("=" * 75)

    api_key = load_api_key()
    print("[1/4] API Key: Configured (length: %d chars, secret safely masked)" % len(api_key))

    sub = get_subscription_info(api_key)
    starting_balance = sub["remaining_credits"]
    print(f"[2/4] Subscription: Tier '{sub['tier']}', Used: {sub['character_count']}, Remaining Balance: {starting_balance:,} credits")

    voice_meta = verify_model_and_voice(api_key)
    print(f"[3/4] Model Verified: '{voice_meta['model_id']}' | Voice Verified: '{voice_meta['voice_name']}' ({voice_meta['voice_id']})")

    narrations = extract_narrations()
    print(f"[4/4] Extracted {len(narrations)} narrations from lib/mock/book-pages.ts")
    print("-" * 75)

    # Calculate page stats
    total_characters = 0
    table_rows = []
    for item in PYTHON_8_PAGES:
        text = narrations.get(item["narration_var"], "")
        if not text:
            raise ValueError(f"Missing narration for {item['narration_var']}")
        char_count = len(text)
        if char_count > 10000:
            raise ValueError(f"Page {item['page_id']} exceeds Eleven v4 10,000-char limit: {char_count} chars")
        total_characters += char_count
        table_rows.append({
            "order": item["order"],
            "file": item["file_name"],
            "page_id": item["page_id"],
            "title": item["title"],
            "chars": char_count,
            "cost": char_count,  # 1 credit / char
        })

    # Print dry-run report table
    print(f"{'Order':<6} {'File Name':<14} {'Page ID':<19} {'Title':<28} {'Chars':>6} {'Cost':>6}")
    print("-" * 85)
    for r in table_rows:
        print(f"{r['order']:<6} {r['file']:<14} {r['page_id']:<19} {r['title'][:27]:<28} {r['chars']:>6} {r['cost']:>6}")
    print("-" * 85)
    print(f"{'TOTAL ESTIMATED GENERATION COST:':<69} {total_characters:>6} credits")
    print("=" * 85)

    # Budget evaluation
    safe_budget = min(HARD_BUDGET_CAP, starting_balance - RESERVE_CREDITS)
    projected_remaining = starting_balance - total_characters

    print("\n--- BUDGET ENFORCEMENT AUDIT ---")
    print(f"Current Available Balance:    {starting_balance:,} credits")
    print(f"Strict Reserve Threshold:     {RESERVE_CREDITS:,} credits")
    print(f"Enforced Safe Spending Cap:   {safe_budget:,} credits (lower of 9,000 and balance - 900)")
    print(f"Total Required Characters:    {total_characters:,} credits")
    print(f"Projected Remaining Balance:  {projected_remaining:,} credits")

    if total_characters > safe_budget:
        print("\n[FAILED] Generation cost exceeds the safe spending cap! STOPPING before any audio calls.")
        sys.exit(1)
    elif projected_remaining < RESERVE_CREDITS:
        print(f"\n[FAILED] Projected remaining credits ({projected_remaining}) is below reserve ({RESERVE_CREDITS})! STOPPING.")
        sys.exit(1)
    else:
        print(f"\n[PASSED] Generation cost fits well within safe budget. {projected_remaining:,} credits will remain (>{RESERVE_CREDITS:,} reserve).")


def run_execute() -> None:
    """Execute preflight, generate missing audio files sequentially, and save manifest."""
    api_key = load_api_key()
    sub_before = get_subscription_info(api_key)
    starting_balance = sub_before["remaining_credits"]

    voice_meta = verify_model_and_voice(api_key)
    narrations = extract_narrations()

    # Budget check
    total_characters = sum(len(narrations[item["narration_var"]]) for item in PYTHON_8_PAGES)
    safe_budget = min(HARD_BUDGET_CAP, starting_balance - RESERVE_CREDITS)
    if total_characters > safe_budget:
        print(f"ERROR: Total characters ({total_characters}) exceeds safe budget ({safe_budget})!")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("\n=======================================================")
    print("STARTING ELEVEN V4 SEQUENTIAL AUDIO GENERATION")
    print("=======================================================")
    print(f"Target Directory: {OUTPUT_DIR}")
    print(f"Model ID:         {voice_meta['model_id']}")
    print(f"Voice ID:         {voice_meta['voice_id']} ({voice_meta['voice_name']})")
    print(f"Output Format:    {TARGET_OUTPUT_FORMAT}")
    print("-------------------------------------------------------\n")

    page_manifests = []
    generated_count = 0
    skipped_count = 0

    for item in PYTHON_8_PAGES:
        order = item["order"]
        file_name = item["file_name"]
        page_id = item["page_id"]
        title = item["title"]
        target_path = OUTPUT_DIR / file_name
        tmp_path = OUTPUT_DIR / f"{file_name}.tmp"
        text = narrations[item["narration_var"]]
        char_count = len(text)

        # Skip check
        if target_path.exists() and target_path.stat().st_size > 1000:
            print(f"[{order}/8] SKIP: '{file_name}' ({page_id}) already exists ({target_path.stat().st_size:,} bytes).")
            with open(target_path, "rb") as f:
                raw_bytes = f.read()
            sha256 = hashlib.sha256(raw_bytes).hexdigest()
            duration = get_audio_duration_seconds(target_path)
            skipped_count += 1
            page_manifests.append({
                "pageOrder": order,
                "pageId": page_id,
                "chapterNumber": item["chapter"],
                "pageNumber": item["page"],
                "title": title,
                "fileName": file_name,
                "path": f"/audio/python-demo/{file_name}",
                "charCount": char_count,
                "byteSize": len(raw_bytes),
                "durationSeconds": duration,
                "sha256": sha256,
            })
            continue

        print(f"[{order}/8] GENERATING: '{file_name}' ({page_id}, {char_count:,} chars)...")
        start_t = time.time()

        payload = json.dumps({
            "text": text,
            "model_id": TARGET_MODEL_ID,
        }).encode("utf-8")

        endpoint = f"/v1/text-to-speech/{TARGET_VOICE_ID}?output_format={TARGET_OUTPUT_FORMAT}"
        audio_bytes = api_request(endpoint, api_key, method="POST", data=payload)

        if not isinstance(audio_bytes, bytes) or len(audio_bytes) < 1000:
            raise RuntimeError(f"Received invalid or truncated audio bytes for {file_name}: length {len(audio_bytes) if isinstance(audio_bytes, bytes) else 'not-bytes'}")

        # Atomic write: write to .tmp then rename
        with open(tmp_path, "wb") as f:
            f.write(audio_bytes)
        
        if target_path.exists():
            target_path.unlink()
        tmp_path.rename(target_path)

        elapsed = time.time() - start_t
        sha256 = hashlib.sha256(audio_bytes).hexdigest()
        duration = get_audio_duration_seconds(target_path)
        generated_count += 1

        print(f"       -> Saved '{file_name}': {len(audio_bytes):,} bytes, ~{duration}s duration, generated in {elapsed:.2f}s")
        page_manifests.append({
            "pageOrder": order,
            "pageId": page_id,
            "chapterNumber": item["chapter"],
            "pageNumber": item["page"],
            "title": title,
            "fileName": file_name,
            "path": f"/audio/python-demo/{file_name}",
            "charCount": char_count,
            "byteSize": len(audio_bytes),
            "durationSeconds": duration,
            "sha256": sha256,
        })

        # Polite 1-second pause between calls
        time.sleep(1.0)

    # Post-generation subscription balance check
    sub_after = get_subscription_info(api_key)
    ending_balance = sub_after["remaining_credits"]
    actual_spent = starting_balance - ending_balance

    manifest_data = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "modelId": TARGET_MODEL_ID,
        "voiceId": TARGET_VOICE_ID,
        "voiceName": voice_meta["voice_name"],
        "outputFormat": TARGET_OUTPUT_FORMAT,
        "startingBalance": starting_balance,
        "endingBalance": ending_balance,
        "totalCreditsSpent": actual_spent,
        "reservePreserved": ending_balance >= RESERVE_CREDITS,
        "generatedFileCount": generated_count,
        "reusedFileCount": skipped_count,
        "pages": page_manifests,
    }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    print("\n-------------------------------------------------------")
    print(f"GENERATION COMPLETE:")
    print(f"- Newly Generated:  {generated_count} files")
    print(f"- Reused/Existing:  {skipped_count} files")
    print(f"- Starting Balance: {starting_balance:,} credits")
    print(f"- Ending Balance:   {ending_balance:,} credits")
    print(f"- Actual Spent:     {actual_spent:,} credits")
    print(f"- Manifest Saved:   {MANIFEST_PATH}")
    print("=======================================================\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate prebuilt ElevenLabs Eleven v4 audio for Python demo pages.")
    parser.add_argument("--dry-run", action="store_true", default=False, help="Run preflight & budget calculations without API calls.")
    parser.add_argument("--execute", action="store_true", default=False, help="Execute audio generation for missing pages.")
    args = parser.parse_args()

    if not args.execute and not args.dry_run:
        args.dry_run = True

    if args.dry_run:
        run_dry_run()
    elif args.execute:
        run_execute()


if __name__ == "__main__":
    main()
