# STT Evaluation Harness

Measurement framework for Tanglish (Tamil + English code-mixed) speech-to-text accuracy.

## Components

- **glossary.json**: Python term glossary with Tamil transliteration variants
- **manifest_template.csv**: 40 Tanglish prompt sentences covering typical learner questions
- **recorder.py**: Interactive audio recorder for creating evaluation dataset
- **harness.py**: CLI evaluation runner that computes metrics and generates reports
- **metrics.py**: WER, CER, Python-term recall, language detection accuracy

## Quick Start

### 1. Record Evaluation Dataset

Install recording dependencies (optional, only needed if you want to record audio):

```bash
pip install sounddevice scipy
```

Record the 40 utterances from manifest_template.csv:

```bash
cd backend
python -m stt_eval.recorder --manifest stt_eval/manifest_template.csv --output stt_eval/audio/
```

**Instructions during recording:**
- Read each reference text naturally in Tanglish
- Press ENTER to start recording
- Speak clearly for 5-10 seconds
- Press ENTER to stop (or Ctrl+C to stop early)
- Review and re-record if needed ('r'), or continue (ENTER)

The recorder creates `stt_eval/audio/t01.wav`, `t02.wav`, etc.

### 2. Run Evaluation

After recording (or using existing audio files), evaluate all configured providers:

```bash
cd backend
python -m stt_eval.harness \
  --manifest stt_eval/manifest_template.csv \
  --glossary stt_eval/glossary.json \
  --output stt_eval/results \
  --providers local,groq
```

This generates:
- `stt_eval/results/evaluation_results.json` (detailed per-sample results)
- `stt_eval/results/evaluation_report.md` (human-readable summary table)

### 3. Review Results

Open `stt_eval/results/evaluation_report.md`:

```markdown
| Provider | Samples | Success | Failed | Python Term Recall | WER | CER | Lang Accuracy | Latency (s/audio-s) |
|----------|---------|---------|--------|-------------------|-----|-----|---------------|---------------------|
| faster-whisper | 40 | 40 | 0 | 87.50% | 12.34% | 8.21% | 95.00% | 1.23 |
| groq-whisper | 40 | 40 | 0 | 82.15% | 15.67% | 10.45% | 92.50% | 0.45 |
```

**Decision Rule** (in priority order):
1. **Python-term recall** (highest = best) — fraction of expected terms found
2. **WER** (lowest = best) — word error rate
3. **Latency** (lowest = best) — processing time per second of audio

## Glossary Format

`glossary.json` maps canonical English Python terms to accepted Tamil variants:

```json
{
  "list": ["லிஸ்ட்", "list"],
  "function": ["பங்க்ஷன்", "function"],
  "variable": ["வேரியபிள்", "variable"]
}
```

A term is considered "found" if it appears in the transcript in English (exact match) or as any glossary variant.

## Manifest Format

`manifest_template.csv` with columns:

- **id**: unique sample identifier (e.g., t01, t02)
- **audio_file**: relative path to audio file (e.g., audio/t01.wav)
- **reference_text**: ground truth transcription
- **language**: BCP-47 language code (ta, en)
- **expected_terms**: comma-separated Python terms that must appear

Example row:
```csv
t01,audio/t01.wav,Python-ல variable-ஐ எப்படி declare பண்றது,ta,python variable declare
```

## Metrics Explained

### Python-Term Recall
Fraction of expected terms found in transcript (exact English match or glossary variant).

**Example:**
- Expected: `["list", "function"]`
- Hypothesis: "Python-ல list-ஐ எப்படி use பண்றது"
- Found: `["list"]`, Missing: `["function"]`
- Recall: 50%

### WER (Word Error Rate)
Levenshtein distance at word level: `(substitutions + deletions + insertions) / reference_words`

**Example:**
- Reference: "list ஐ எப்படி use பண்றது"
- Hypothesis: "list ல எப்படி used பண்றது"
- Edits: 2 (ஐ→ல, use→used)
- WER: 2/5 = 40%

### CER (Character Error Rate)
Same as WER but at character level. More forgiving for Tamil script variations.

### Language Accuracy
Fraction of samples where detected language matches expected language (prefix match, e.g., "ta" matches "ta-IN").

### Latency
Processing time per second of audio. Values < 1.0 mean faster than real-time.

## No Audio Recording?

If you don't have a microphone or prefer not to record:

1. Use synthetic TTS to generate audio from reference texts
2. Use existing Tanglish audio samples
3. Skip recording and focus on improving provider configurations

The harness measures **real** accuracy on **real** audio. Without measured data, accuracy claims are speculation.
