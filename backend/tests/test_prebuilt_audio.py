"""
tests/test_prebuilt_audio.py

Unit test suite verifying prebuilt ElevenLabs Eleven v4 audio assets,
manifest completeness, SHA-256 integrity, and budget/safety constraints.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
AUDIO_DIR = PROJECT_ROOT / "public" / "audio" / "python-demo"
MANIFEST_PATH = AUDIO_DIR / "manifest.json"

EXPECTED_PAGES = [
    "lesson_python_1_1",
    "lesson_python_1_2",
    "lesson_python_1_3",
    "lesson_python_1_4",
    "lesson_python_1_5",
    "lesson_python_1_6",
    "lesson_python_2_1",
    "lesson_python_2_2",
]


def test_manifest_exists_and_valid():
    assert MANIFEST_PATH.exists(), f"Manifest missing at {MANIFEST_PATH}"
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["modelId"] == "eleven_v4"
    assert data["voiceId"] == "CwhRBWXzGAHq8TQ4Fs17"
    assert "Roger" in data["voiceName"]
    assert data["outputFormat"] == "mp3_44100_128"
    assert data["reservePreserved"] is True
    assert data["endingBalance"] >= 900
    assert data["totalCreditsSpent"] <= 9000
    assert len(data["pages"]) == 8


def test_manifest_no_secrets():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        raw_text = f.read().lower()

    # Ensure no API key terms or secret tokens are present
    assert "api_key" not in raw_text
    assert "xi-api-key" not in raw_text
    assert "secret" not in raw_text
    assert "authorization" not in raw_text


def test_all_8_audio_files_exist_and_match_sha256():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    manifest_page_ids = [p["pageId"] for p in data["pages"]]
    assert manifest_page_ids == EXPECTED_PAGES

    for idx, page in enumerate(data["pages"], start=1):
        file_name = page["fileName"]
        expected_file = f"page-0{idx}.mp3"
        assert file_name == expected_file

        file_path = AUDIO_DIR / file_name
        assert file_path.exists(), f"File {file_name} missing on disk"

        file_bytes = file_path.read_bytes()
        assert len(file_bytes) > 500_000, f"File {file_name} suspiciously small: {len(file_bytes)}"
        assert page["byteSize"] == len(file_bytes)

        # Verify SHA-256 hash
        calc_sha = hashlib.sha256(file_bytes).hexdigest()
        assert page["sha256"] == calc_sha, f"Hash mismatch for {file_name}"

        # Verify non-zero duration
        assert page["durationSeconds"] > 30.0, f"Duration too short for {file_name}: {page['durationSeconds']}"
