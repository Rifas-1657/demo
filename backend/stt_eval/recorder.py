"""
stt_eval/recorder.py — Simple audio recorder for creating evaluation dataset.

Usage:
    python -m stt_eval.recorder --manifest manifest_template.csv --output audio/

Records each utterance in the manifest, saving as WAV files.
Press ENTER to start recording, SPACE to stop, 'q' to quit.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

try:
    import sounddevice as sd
    import scipy.io.wavfile as wavfile
    import numpy as np
except ImportError:
    print("ERROR: sounddevice and scipy are required for recording.")
    print("Install with: pip install sounddevice scipy")
    sys.exit(1)

from stt_eval.manifest import load_manifest


SAMPLE_RATE = 16000  # 16kHz is standard for speech recognition


def record_audio(duration_s: float = 10.0) -> np.ndarray:
    """
    Record audio from default microphone.
    
    Args:
        duration_s: Maximum recording duration in seconds
    
    Returns:
        Audio data as numpy array
    """
    print(f"Recording for up to {duration_s} seconds... (Press Ctrl+C to stop early)")
    try:
        audio = sd.rec(
            int(duration_s * SAMPLE_RATE),
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype='int16',
        )
        sd.wait()  # Wait for recording to finish
        return audio
    except KeyboardInterrupt:
        sd.stop()
        print("\nRecording stopped by user.")
        return audio[:sd.get_stream().write_available]


def main() -> int:
    """CLI entry point for recorder."""
    parser = argparse.ArgumentParser(description="Record audio samples for STT evaluation")
    parser.add_argument(
        "--manifest",
        type=Path,
        required=True,
        help="Path to manifest template CSV",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("stt_eval/audio"),
        help="Output directory for audio files",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=10.0,
        help="Maximum recording duration per sample (seconds)",
    )
    parser.add_argument(
        "--start-from",
        type=str,
        default=None,
        help="Start recording from this sample ID (resume incomplete session)",
    )
    
    args = parser.parse_args()
    
    # Load manifest
    entries = load_manifest(args.manifest)
    print(f"Loaded {len(entries)} utterances from manifest.")
    
    # Create output directory
    args.output.mkdir(parents=True, exist_ok=True)
    
    # Find start position if resuming
    start_index = 0
    if args.start_from:
        for i, entry in enumerate(entries):
            if entry.id == args.start_from:
                start_index = i
                break
        else:
            print(f"ERROR: Start ID '{args.start_from}' not found in manifest.")
            return 1
    
    print("\n" + "="*70)
    print("STT EVALUATION RECORDER")
    print("="*70)
    print("\nInstructions:")
    print("  - Read the reference text naturally in Tanglish")
    print("  - Press ENTER to start recording")
    print("  - Speak clearly, then press ENTER to stop")
    print("  - Type 'r' to re-record the current sample")
    print("  - Type 's' to skip the current sample")
    print("  - Type 'q' to quit")
    print("="*70 + "\n")
    
    # Record each entry
    for i in range(start_index, len(entries)):
        entry = entries[i]
        output_path = args.output / entry.audio_file
        
        # Check if already recorded
        if output_path.exists():
            print(f"\n[{i+1}/{len(entries)}] {entry.id} — Already recorded, skipping.")
            continue
        
        while True:
            print(f"\n[{i+1}/{len(entries)}] {entry.id}")
            print(f"Reference: {entry.reference_text}")
            print(f"Expected terms: {', '.join(entry.expected_terms)}")
            print(f"Language: {entry.language}")
            print(f"\nOutput: {output_path}")
            print("\nPress ENTER to start recording, 's' to skip, 'q' to quit: ", end="")
            
            user_input = input().strip().lower()
            
            if user_input == 'q':
                print("\nRecording session ended by user.")
                print(f"Progress: {i}/{len(entries)} samples recorded.")
                return 0
            elif user_input == 's':
                print("Skipped.")
                break
            elif user_input == '' or user_input == 'r':
                # Record
                print(f"\nRecording for up to {args.duration}s...")
                print("Press Ctrl+C to stop early.")
                time.sleep(0.5)  # Brief delay before recording
                
                try:
                    audio_data = record_audio(duration_s=args.duration)
                    
                    # Save to WAV file
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    wavfile.write(str(output_path), SAMPLE_RATE, audio_data)
                    
                    print(f"✓ Saved to {output_path}")
                    print("\nPress ENTER to continue, 'r' to re-record, 'q' to quit: ", end="")
                    
                    review_input = input().strip().lower()
                    if review_input == 'q':
                        print("\nRecording session ended by user.")
                        print(f"Progress: {i+1}/{len(entries)} samples recorded.")
                        return 0
                    elif review_input == 'r':
                        print("Re-recording...")
                        continue
                    else:
                        break  # Move to next sample
                        
                except Exception as exc:
                    print(f"\nERROR: Recording failed: {exc}")
                    print("Press ENTER to retry, 's' to skip, 'q' to quit: ", end="")
                    error_input = input().strip().lower()
                    if error_input == 'q':
                        return 1
                    elif error_input == 's':
                        break
                    else:
                        continue
            else:
                print("Invalid input. Press ENTER to record, 's' to skip, 'q' to quit.")
    
    print("\n" + "="*70)
    print(f"Recording complete! {len(entries)} samples recorded.")
    print(f"Audio files saved to: {args.output}")
    print("="*70)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
