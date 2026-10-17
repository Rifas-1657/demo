"""
stt_eval/harness.py — CLI evaluation harness for STT providers.

Usage:
    python -m stt_eval.harness --manifest manifest.csv --glossary glossary.json --output results/

Reads manifest.csv with columns: id, audio_file, reference_text, language, expected_terms (comma-separated)
Runs configured STT providers, computes metrics, writes JSON + markdown report.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from stt_eval.manifest import load_manifest, ManifestEntry
from stt_eval.metrics import (
    compute_cer,
    compute_language_accuracy,
    compute_python_term_recall,
    compute_wer,
)

log = logging.getLogger(__name__)


@dataclass
class EvalResult:
    """Evaluation result for a single audio sample."""
    id: str
    reference_text: str
    hypothesis: str
    expected_lang: str
    detected_lang: str
    expected_terms: list[str]
    wer: float
    cer: float
    python_term_recall: float
    python_terms_found: list[str]
    python_terms_missing: list[str]
    language_correct: bool
    latency_s: float
    audio_duration_s: float
    error: str | None = None


@dataclass
class ProviderSummary:
    """Aggregate metrics for a provider across all samples."""
    provider_name: str
    total_samples: int
    successful: int
    failed: int
    mean_wer: float
    mean_cer: float
    mean_python_term_recall: float
    language_accuracy: float
    mean_latency_per_audio_second: float
    total_latency_s: float


async def evaluate_provider(
    provider_name: str,
    provider,
    entries: list[ManifestEntry],
    glossary: dict[str, list[str]],
    audio_base_path: Path,
) -> tuple[list[EvalResult], ProviderSummary]:
    """
    Evaluate a single STT provider on all manifest entries.
    
    Args:
        provider_name: Human-readable provider name
        provider: STT provider instance with transcribe() method
        entries: List of manifest entries
        glossary: Python term glossary
        audio_base_path: Base directory for resolving audio file paths
    
    Returns:
        (per_sample_results, aggregate_summary)
    """
    results: list[EvalResult] = []
    
    for entry in entries:
        audio_path = audio_base_path / entry.audio_file
        
        if not audio_path.exists():
            log.warning("Audio file not found: %s", audio_path)
            results.append(EvalResult(
                id=entry.id,
                reference_text=entry.reference_text,
                hypothesis="",
                expected_lang=entry.language,
                detected_lang="",
                expected_terms=entry.expected_terms,
                wer=1.0,
                cer=1.0,
                python_term_recall=0.0,
                python_terms_found=[],
                python_terms_missing=entry.expected_terms,
                language_correct=False,
                latency_s=0.0,
                audio_duration_s=0.0,
                error=f"Audio file not found: {audio_path}",
            ))
            continue
        
        # Read audio file
        try:
            audio_bytes = audio_path.read_bytes()
        except Exception as exc:
            log.error("Failed to read audio file %s: %s", audio_path, exc)
            results.append(EvalResult(
                id=entry.id,
                reference_text=entry.reference_text,
                hypothesis="",
                expected_lang=entry.language,
                detected_lang="",
                expected_terms=entry.expected_terms,
                wer=1.0,
                cer=1.0,
                python_term_recall=0.0,
                python_terms_found=[],
                python_terms_missing=entry.expected_terms,
                language_correct=False,
                latency_s=0.0,
                audio_duration_s=0.0,
                error=f"Failed to read audio: {exc}",
            ))
            continue
        
        # Transcribe
        start_time = time.time()
        try:
            mime_type = get_mime_type(audio_path.suffix)
            stt_result = await provider.transcribe(
                audio_bytes=audio_bytes,
                mime=mime_type,
                hint_lang=entry.language if entry.language else None,
            )
            latency_s = time.time() - start_time
            
            # Compute metrics
            wer = compute_wer(entry.reference_text, stt_result.transcript)
            cer = compute_cer(entry.reference_text, stt_result.transcript)
            
            python_recall, found, missing = compute_python_term_recall(
                expected_terms=entry.expected_terms,
                hypothesis=stt_result.transcript,
                glossary=glossary,
            )
            
            lang_correct = compute_language_accuracy(
                expected_lang=entry.language,
                detected_lang=stt_result.language,
            )
            
            results.append(EvalResult(
                id=entry.id,
                reference_text=entry.reference_text,
                hypothesis=stt_result.transcript,
                expected_lang=entry.language,
                detected_lang=stt_result.language,
                expected_terms=entry.expected_terms,
                wer=wer,
                cer=cer,
                python_term_recall=python_recall,
                python_terms_found=found,
                python_terms_missing=missing,
                language_correct=lang_correct,
                latency_s=latency_s,
                audio_duration_s=stt_result.duration_s,
                error=None,
            ))
            
        except Exception as exc:
            latency_s = time.time() - start_time
            log.error("Provider %s failed on %s: %s", provider_name, entry.id, exc)
            results.append(EvalResult(
                id=entry.id,
                reference_text=entry.reference_text,
                hypothesis="",
                expected_lang=entry.language,
                detected_lang="",
                expected_terms=entry.expected_terms,
                wer=1.0,
                cer=1.0,
                python_term_recall=0.0,
                python_terms_found=[],
                python_terms_missing=entry.expected_terms,
                language_correct=False,
                latency_s=latency_s,
                audio_duration_s=0.0,
                error=str(exc),
            ))
    
    # Compute aggregate summary
    successful = [r for r in results if r.error is None]
    failed = [r for r in results if r.error is not None]
    
    if successful:
        mean_wer = sum(r.wer for r in successful) / len(successful)
        mean_cer = sum(r.cer for r in successful) / len(successful)
        mean_python_recall = sum(r.python_term_recall for r in successful) / len(successful)
        lang_accuracy = sum(1 for r in successful if r.language_correct) / len(successful)
        
        # Latency per second of audio
        total_latency = sum(r.latency_s for r in successful)
        total_audio_duration = sum(r.audio_duration_s for r in successful)
        mean_latency_per_audio_sec = (
            total_latency / total_audio_duration if total_audio_duration > 0 else 0.0
        )
    else:
        mean_wer = 1.0
        mean_cer = 1.0
        mean_python_recall = 0.0
        lang_accuracy = 0.0
        mean_latency_per_audio_sec = 0.0
        total_latency = 0.0
    
    summary = ProviderSummary(
        provider_name=provider_name,
        total_samples=len(results),
        successful=len(successful),
        failed=len(failed),
        mean_wer=mean_wer,
        mean_cer=mean_cer,
        mean_python_term_recall=mean_python_recall,
        language_accuracy=lang_accuracy,
        mean_latency_per_audio_second=mean_latency_per_audio_sec,
        total_latency_s=sum(r.latency_s for r in results),
    )
    
    return results, summary


def get_mime_type(suffix: str) -> str:
    """Map file extension to MIME type."""
    suffix = suffix.lower()
    mime_map = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".webm": "audio/webm",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".mp4": "audio/mp4",
        ".flac": "audio/flac",
    }
    return mime_map.get(suffix, "audio/wav")


def write_json_report(
    results_by_provider: dict[str, list[EvalResult]],
    summaries: list[ProviderSummary],
    output_path: Path,
) -> None:
    """Write detailed JSON report."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    data = {
        "summaries": [asdict(s) for s in summaries],
        "results_by_provider": {
            prov: [asdict(r) for r in results]
            for prov, results in results_by_provider.items()
        },
    }
    
    output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    log.info("Wrote JSON report: %s", output_path)


def write_markdown_report(
    summaries: list[ProviderSummary],
    output_path: Path,
) -> None:
    """Write human-readable markdown table."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    lines = [
        "# STT Provider Evaluation Results",
        "",
        "## Summary Table",
        "",
        "| Provider | Samples | Success | Failed | Python Term Recall | WER | CER | Lang Accuracy | Latency (s/audio-s) |",
        "|----------|---------|---------|--------|-------------------|-----|-----|---------------|---------------------|",
    ]
    
    for s in summaries:
        lines.append(
            f"| {s.provider_name} | {s.total_samples} | {s.successful} | {s.failed} | "
            f"{s.mean_python_term_recall:.2%} | {s.mean_wer:.2%} | {s.mean_cer:.2%} | "
            f"{s.language_accuracy:.2%} | {s.mean_latency_per_audio_second:.2f} |"
        )
    
    lines.extend([
        "",
        "## Decision Rule",
        "",
        "1. **Python-term recall** (highest is best) — critical for learner comprehension",
        "2. **WER** (lowest is best) — overall transcription accuracy",
        "3. **Latency** (lowest is best) — user experience",
        "",
        "## Interpretation",
        "",
        "- **Python Term Recall**: Fraction of expected Python terms found in transcript (exact or glossary variant)",
        "- **WER**: Word Error Rate (0% = perfect, 100% = all words wrong)",
        "- **CER**: Character Error Rate",
        "- **Lang Accuracy**: Fraction of samples with correct language detection",
        "- **Latency**: Processing time per second of audio",
        "",
    ])
    
    output_path.write_text("\n".join(lines), encoding="utf-8")
    log.info("Wrote markdown report: %s", output_path)


async def run_evaluation(
    manifest_path: Path,
    glossary_path: Path,
    output_dir: Path,
    providers: dict[str, Any],
) -> None:
    """
    Run full evaluation harness.
    
    Args:
        manifest_path: Path to manifest.csv
        glossary_path: Path to glossary.json
        output_dir: Output directory for results
        providers: Dict of provider_name -> provider_instance
    """
    # Load data
    entries = load_manifest(manifest_path)
    log.info("Loaded %d manifest entries", len(entries))
    
    if not glossary_path.exists():
        log.warning("Glossary not found: %s, using empty glossary", glossary_path)
        glossary = {}
    else:
        glossary = json.loads(glossary_path.read_text(encoding="utf-8"))
        log.info("Loaded glossary with %d terms", len(glossary))
    
    audio_base_path = manifest_path.parent
    
    # Evaluate each provider
    results_by_provider = {}
    summaries = []
    
    for provider_name, provider in providers.items():
        log.info("Evaluating provider: %s", provider_name)
        results, summary = await evaluate_provider(
            provider_name=provider_name,
            provider=provider,
            entries=entries,
            glossary=glossary,
            audio_base_path=audio_base_path,
        )
        results_by_provider[provider_name] = results
        summaries.append(summary)
        log.info(
            "Provider %s: Python-term-recall=%.2f%%, WER=%.2f%%, CER=%.2f%%, "
            "Lang-accuracy=%.2f%%, Latency=%.2fs/audio-s",
            provider_name,
            summary.mean_python_term_recall * 100,
            summary.mean_wer * 100,
            summary.mean_cer * 100,
            summary.language_accuracy * 100,
            summary.mean_latency_per_audio_second,
        )
    
    # Sort summaries by decision rule: Python-term recall (desc), WER (asc), latency (asc)
    summaries.sort(
        key=lambda s: (-s.mean_python_term_recall, s.mean_wer, s.mean_latency_per_audio_second)
    )
    
    # Write reports
    write_json_report(results_by_provider, summaries, output_dir / "evaluation_results.json")
    write_markdown_report(summaries, output_dir / "evaluation_report.md")
    
    log.info("Evaluation complete. Results written to %s", output_dir)


def main() -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="STT evaluation harness for Tanglish")
    parser.add_argument(
        "--manifest",
        type=Path,
        required=True,
        help="Path to manifest.csv",
    )
    parser.add_argument(
        "--glossary",
        type=Path,
        required=True,
        help="Path to glossary.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("stt_eval/results"),
        help="Output directory for results",
    )
    parser.add_argument(
        "--providers",
        type=str,
        default="local",
        help="Comma-separated list of providers to evaluate (local, groq)",
    )
    
    args = parser.parse_args()
    
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
    
    # Import providers (must be after sys.path adjustment if running as script)
    try:
        from app.voice.stt.faster_whisper import FasterWhisperSTT
        from app.voice.stt.groq_whisper import GroqWhisperSTT
        from app.config import get_settings
    except ImportError as exc:
        log.error("Failed to import STT providers: %s", exc)
        log.error("Make sure to run from backend/ directory: python -m stt_eval.harness")
        return 1
    
    settings = get_settings()
    
    # Build provider instances
    providers = {}
    provider_names = [p.strip() for p in args.providers.split(",")]
    
    for prov in provider_names:
        if prov == "local":
            providers["faster-whisper"] = FasterWhisperSTT(
                model_name=settings.faster_whisper_model,
            )
        elif prov == "groq":
            if not settings.groq_api_key:
                log.warning("Groq API key not configured, skipping groq provider")
            else:
                providers["groq-whisper"] = GroqWhisperSTT(
                    api_key=settings.groq_api_key,
                    model=settings.groq_whisper_model,
                )
        else:
            log.warning("Unknown provider: %s", prov)
    
    if not providers:
        log.error("No valid providers configured")
        return 1
    
    # Run evaluation
    asyncio.run(run_evaluation(
        manifest_path=args.manifest,
        glossary_path=args.glossary,
        output_dir=args.output,
        providers=providers,
    ))
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
