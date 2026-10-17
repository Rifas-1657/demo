"""
stt_eval/manifest.py — Load and parse manifest.csv.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path


@dataclass
class ManifestEntry:
    """A single test utterance with reference transcript and metadata."""
    id: str
    audio_file: str
    reference_text: str
    language: str
    expected_terms: list[str]


def load_manifest(path: Path) -> list[ManifestEntry]:
    """
    Load manifest CSV file.
    
    Expected columns:
    - id: unique identifier
    - audio_file: relative path to audio file (from manifest directory)
    - reference_text: ground truth transcription
    - language: BCP-47 language code (e.g., "ta", "en")
    - expected_terms: comma-separated list of Python terms that should appear
    
    Returns:
        List of ManifestEntry objects
    """
    entries = []
    
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Parse expected_terms (comma-separated)
            expected_terms_str = row.get("expected_terms", "").strip()
            if expected_terms_str:
                expected_terms = [t.strip() for t in expected_terms_str.split(",") if t.strip()]
            else:
                expected_terms = []
            
            entries.append(ManifestEntry(
                id=row["id"].strip(),
                audio_file=row["audio_file"].strip(),
                reference_text=row["reference_text"].strip(),
                language=row.get("language", "ta").strip(),
                expected_terms=expected_terms,
            ))
    
    return entries
