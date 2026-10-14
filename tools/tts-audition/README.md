# Bookey — Local TTS Audition Lab

An isolated audio evaluation workspace to benchmark and listen to real Text-to-Speech (TTS) models for Bookey before selecting a production voice.

---

## Workspace Isolation & Safety Guarantee

- **Zero Integration**: The Bookey application backend (`backend/`), frontend (`app/`, `components/`), dependencies, API routes, and database (`bookey_dev.db`) are **completely untouched**.
- **Isolated Environment**: All inference runtimes and dependencies operate in an isolated virtual environment (`tools/tts-audition/.venv`).
- **Sequential Execution**: Candidate models were loaded and evaluated one at a time on CPU, respecting the laptop's RTX 3050 (4 GB VRAM) limit without causing GPU Out-Of-Memory (OOM) or system instability.
- **Git Protection**: Large model weights and generated WAV files are ignored by `tools/tts-audition/.gitignore`.

---

## Candidate Models & Evaluation Summary

| # | Candidate Model | Architecture | License | Status | Notes |
|---|---|---|---|:---:|---|
| **1** | `prasadvittaldev/pocket-tts-tamil-female-audiobook` | Flow-Matching + Mimi Codec | **MIT** | **SUCCESS** | Generated all 3 test cases in both Romanized Tanglish and Tamil script. Fast CPU generation (~1.9x real-time). |
| **2** | `Jeyaram-K/piper-tamil-voices` | VITS (ONNX Runtime) | **Apache 2.0** | **SUCCESS** | Generated all 3 test cases. Ultra-fast CPU inference (~14x-18x real-time, ~0.3s per sentence). |
| **3** | `facebook/mms-tts-tam` | VITS (Meta AI) | **CC-BY-NC 4.0** | **SUCCESS (Audition Only)** | Clear Tamil synthesis, but Latin letters map to `<unk>` tokens, and license strictly forbids commercial use. |
| **4** | `ai4bharat/IndicF5` | F5-TTS (Flow-matching) | **MIT (Gated)** | **FAILED (Gated)** | Returns HTTP 401 Unauthorized. Requires Hugging Face login, terms acceptance, token, and a reference audio prompt. |
| **5** | `ai4bharat/indic-parler-tts` | Parler-TTS | **Apache 2.0 (Gated)** | **FAILED (Gated / &gt;2GB)** | Returns HTTP 401 Unauthorized. Requires Hugging Face access approval. Checkpoint &gt;2.2 GB exceeds local 2 GB download safety limit. |
| **REF** | `sugiv/fish-speech-1.5-tanglish` | Dual-AR LLaMA + VQGAN | **CC-BY-NC-SA 4.0** | **REFERENCE ONLY** | Upstream evaluation set of 15 genuine Tanglish WAVs downloaded for comparative listening. Model requires &gt;12 GB GPU VRAM. |

---

## Quickstart — Exact PowerShell Commands

Open PowerShell in `Bookeyy-main`:

### 1. Launch the Listening Page (Browser)

To listen to all generated clips, compare test sentences side-by-side, and submit your ratings:

```powershell
# From the project root (Bookeyy-main):
cd tools/tts-audition
python -m http.server 8080
```

Now open your browser at:
👉 **[http://localhost:8080](http://localhost:8080)**

*(Alternatively, you can double-click `tools/tts-audition/index.html` to open it directly in Chrome/Edge/Firefox).*

---

### 2. Regenerate Audition Samples (Optional)

If you ever wish to re-run the generation pipeline from scratch:

```powershell
# Activate the isolated virtual environment
.\tools\tts-audition\.venv\Scripts\Activate.ps1

# Run the automated runner and validator
python tools/tts-audition/generate_audition.py
```

This will:
1. Reload Candidate 1 (`pocket-tts`) and synthesize Romanized & Tamil script clips.
2. Reload Candidate 2 (`piper`) and synthesize Tamil & Phonetic loanword clips.
3. Reload Candidate 3 (`mms-tts`) and synthesize Tamil & Phonetic loanword clips.
4. Perform access probes for Candidates 4 & 5.
5. Validate all WAV headers, sample rates, silence levels, and durations.
6. Refresh `tools/tts-audition/audition_metadata.json`.

---

### 3. Rate and Export Your Preferences

1. Use the interactive audio players in the listening lab to hear equivalent sentences back-to-back.
2. Rate each candidate on:
   - **Naturalness** (1–5)
   - **Tanglish Pronunciation** (1–5)
   - **Technical Word Pronunciation** (React, useState, Python, etc.)
   - **Clarity & Articulation** (1–5)
   - **Missing / Skipped Words**
   - **Overall Preference** (1–10)
   - **Qualitative Notes**
3. Your inputs are **automatically saved** to browser `localStorage` as you type.
4. Click **"Export Ratings (CSV)"** or **"Export Ratings (JSON)"** in the top toolbar to download your completed rubric.
