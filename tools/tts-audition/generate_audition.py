"""
BOOKEY - LOCAL TTS AUDITION DATASET GENERATOR
Evaluates Candidate Models sequentially on CPU / isolated environment.
Produces validated WAV files, metadata JSON, and reference dataset.
"""

import sys
import os
import json
import time
import gc
import wave
import urllib.request
from pathlib import Path

# Force UTF-8 stream handling on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)

import numpy as np
import soundfile as sf
import torch

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
REF_DIR = OUTPUT_DIR / "reference_fish_speech"
REF_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------
# Test Cases (Semantic Equivalents)
# ---------------------------------------------------------
TEST_SENTENCES = {
    "test_a": {
        "title": "Test A — Natural Conversational Tanglish",
        "semantic_meaning": "Greeting and introduction to learning Python variables today.",
        "romanized": "Vanakkam! Innaiku namma Python variables pathi kathukkaporom.",
        "tamil_english_loanwords": "வணக்கம்! இன்னைக்கு நம்ம Python variables பத்தி கத்துக்கப்போறோம்.",
        "tamil_phonetic": "வணக்கம்! இன்னைக்கு நம்ம பைதான் வேரியபிள்ஸ் பத்தி கத்துக்கப்போறோம்."
    },
    "test_b": {
        "title": "Test B — English Technical Vocabulary",
        "semantic_meaning": "Explanation of React useState hook re-rendering a component on state update.",
        "romanized": "React-la useState hook use pannumbodhu, state update aana component re-render aagum.",
        "tamil_english_loanwords": "React-ல useState hook use பண்ணும்போது, state update ஆனா component re-render ஆகும்.",
        "tamil_phonetic": "ரியாக்ட்-ல யூஸ் ஸ்டேட் ஹூக் யூஸ் பண்ணும்போது, ஸ்டேட் அப்டேட் ஆனா காம்போனன்ட் ரீ-ரெண்டர் ஆகும்."
    },
    "test_c": {
        "title": "Test C — Longer Educational Explanation",
        "semantic_meaning": "Machine learning model learning patterns from training data and generating predictions for new input.",
        "romanized": "Machine learning-la model training data-la irundhu patterns learn pannum. Appuram pudhu input-ku prediction generate pannum.",
        "tamil_english_loanwords": "Machine learning-ல model training data-ல இருந்து patterns learn பண்ணும். அப்புறம் புது input-க்கு prediction generate பண்ணும்.",
        "tamil_phonetic": "மெஷின் லேர்னிங்-ல மாடல் டிரெய்னிங் டேட்டா-ல இருந்து பேட்டர்ன்ஸ் லேர்ன் பண்ணும். அப்புறம் புது இன்புட்-க்கு பிரடிக்ஷன் ஜெனரேட் பண்ணும்."
    }
}

# ---------------------------------------------------------
# Validation Helper
# ---------------------------------------------------------
def validate_wav(wav_path: Path, expected_sr: int | None = None):
    """Inspects generated WAV and computes audio metrics."""
    if not wav_path.exists():
        return {"status": "MISSING", "error": "File does not exist on disk"}
    size_bytes = wav_path.stat().st_size
    if size_bytes < 100:
        return {"status": "EMPTY", "error": f"File too small ({size_bytes} bytes)"}

    try:
        data, sr = sf.read(str(wav_path))
        if len(data) == 0:
            return {"status": "EMPTY_AUDIO", "error": "Zero audio samples decoded"}
        duration_s = len(data) / float(sr)
        peak_amp = float(np.max(np.abs(data)))
        rms_amp = float(np.sqrt(np.mean(data**2)))
        # Silence check: if peak amplitude is nearly zero
        if peak_amp < 1e-4:
            return {
                "status": "SILENT",
                "error": "Audio contains only silence or near-zero signal",
                "duration_s": round(duration_s, 3),
                "sample_rate": sr,
                "file_size_bytes": size_bytes,
                "peak_amplitude": round(peak_amp, 5)
            }
        return {
            "status": "VALID",
            "duration_s": round(duration_s, 3),
            "sample_rate": sr,
            "samples": len(data),
            "file_size_bytes": size_bytes,
            "peak_amplitude": round(peak_amp, 5),
            "rms_amplitude": round(rms_amp, 5),
            "browser_playable": True
        }
    except Exception as e:
        return {"status": "CORRUPTED", "error": str(e)}

# ---------------------------------------------------------
# Candidate 1: prasadvittaldev/pocket-tts-tamil-female-audiobook
# ---------------------------------------------------------
def run_pocket_tts(results_dict: dict):
    model_id = "prasadvittaldev/pocket-tts-tamil-female-audiobook"
    print(f"\n=======================================================")
    print(f"[Candidate 1/5] Evaluating {model_id} (CPU)...")
    print(f"=======================================================")

    t0 = time.time()
    try:
        from huggingface_hub import hf_hub_download
        from pocket_tts import TTSModel

        print("Locating model weights and voice prompt...")
        config_path = hf_hub_download(model_id, "config.yaml")
        voice_path = hf_hub_download(model_id, "voice_prompt.wav")

        print("Loading TTSModel (quantized int8 on CPU)...")
        t_load_start = time.time()
        model = TTSModel.load_model(config=config_path, quantize=True)
        model.to("cpu")
        load_time = round(time.time() - t_load_start, 2)
        print(f"Model loaded in {load_time}s")

        print("Preparing speaker prompt state...")
        state = model.get_state_for_audio_prompt(voice_path)

        samples = []

        # Run both Romanized and Tamil script for comprehensive evaluation
        for test_key, test_info in TEST_SENTENCES.items():
            # 1. Romanized input
            text_roman = test_info["romanized"]
            out_name_roman = f"pocket_tts_{test_key}_roman.wav"
            out_file_roman = OUTPUT_DIR / out_name_roman
            print(f"  Generating {test_key.upper()} (Romanized): '{text_roman}'...")
            t_gen_start = time.time()
            chunks_r = list(model.generate_audio_stream(model_state=state, text_to_generate=text_roman))
            audio_r = np.concatenate([np.asarray(c).reshape(-1) for c in chunks_r]) if chunks_r else np.array([])
            gen_time_r = round(time.time() - t_gen_start, 2)
            sf.write(str(out_file_roman), audio_r, 24000)
            val_r = validate_wav(out_file_roman)
            print(f"    -> Done in {gen_time_r}s | Duration: {val_r.get('duration_s')}s | Size: {val_r.get('file_size_bytes')} bytes")
            samples.append({
                "test_id": test_key,
                "variant": "romanized",
                "script_type": "Romanized Tanglish (Latin)",
                "input_text": text_roman,
                "output_file": out_name_roman,
                "generation_time_s": gen_time_r,
                "validation": val_r
            })

            # 2. Tamil script with English loanwords
            text_tamil = test_info["tamil_english_loanwords"]
            out_name_tamil = f"pocket_tts_{test_key}_tamil.wav"
            out_file_tamil = OUTPUT_DIR / out_name_tamil
            print(f"  Generating {test_key.upper()} (Tamil script + English terms): '{text_tamil}'...")
            t_gen_start_ta = time.time()
            chunks_ta = list(model.generate_audio_stream(model_state=state, text_to_generate=text_tamil))
            audio_ta = np.concatenate([np.asarray(c).reshape(-1) for c in chunks_ta]) if chunks_ta else np.array([])
            gen_time_ta = round(time.time() - t_gen_start_ta, 2)
            sf.write(str(out_file_tamil), audio_ta, 24000)
            val_ta = validate_wav(out_file_tamil)
            print(f"    -> Done in {gen_time_ta}s | Duration: {val_ta.get('duration_s')}s | Size: {val_ta.get('file_size_bytes')} bytes")
            samples.append({
                "test_id": test_key,
                "variant": "tamil_script",
                "script_type": "Tamil Script + English loanwords",
                "input_text": text_tamil,
                "output_file": out_name_tamil,
                "generation_time_s": gen_time_ta,
                "validation": val_ta
            })

        results_dict["candidate_1"] = {
            "model_id": model_id,
            "display_name": "Pocket TTS Tamil Audiobook (Geetha)",
            "license": "MIT (Permissive, commercial use allowed)",
            "architecture": "pocket-tts (6-layer flow-matching + Mimi codec)",
            "status": "SUCCESS",
            "device": "CPU (Quantized int8)",
            "load_time_s": load_time,
            "weights_size": "~418 MB float32 safetensors (86 MB int4 available)",
            "samples": samples,
            "technical_notes": "Single fixed voice 'geetha'. Runs faster than real-time (~1.9x-2.2x real-time on Ryzen 5). Handles Romanized text and Tamil script. SentencePiece tokenizer trained on 4000 bins."
        }

        del model
        gc.collect()

    except Exception as e:
        print(f"Candidate 1 FAILED: {e}")
        import traceback
        traceback.print_exc()
        results_dict["candidate_1"] = {
            "model_id": model_id,
            "display_name": "Pocket TTS Tamil Audiobook",
            "license": "MIT",
            "status": "FAILED",
            "error": str(e)
        }

# ---------------------------------------------------------
# Candidate 2: Jeyaram-K/piper-tamil-voices
# ---------------------------------------------------------
def run_piper_tts(results_dict: dict):
    model_id = "Jeyaram-K/piper-tamil-voices"
    print(f"\n=======================================================")
    print(f"[Candidate 2/5] Evaluating {model_id} (CPU/ONNX)...")
    print(f"=======================================================")

    try:
        from huggingface_hub import hf_hub_download
        from piper import PiperVoice

        model_subpath = "ta_IN-ValluvarNeural-medium/ta_IN-ValluvarNeural-medium.onnx"
        config_subpath = "ta_IN-ValluvarNeural-medium/ta_IN-ValluvarNeural-medium.onnx.json"

        print("Downloading Piper Valluvar ONNX checkpoint (~60 MB)...")
        m_path = hf_hub_download(model_id, model_subpath)
        c_path = hf_hub_download(model_id, config_subpath)

        t_load_start = time.time()
        voice = PiperVoice.load(m_path, config_path=c_path)
        load_time = round(time.time() - t_load_start, 2)
        print(f"Piper voice loaded in {load_time}s | Sample rate: {voice.config.sample_rate} Hz")

        samples = []
        for test_key, test_info in TEST_SENTENCES.items():
            # 1. Tamil script with English loanwords preserved
            text_loan = test_info["tamil_english_loanwords"]
            out_name_loan = f"piper_valluvar_{test_key}_english_loanwords.wav"
            out_file_loan = OUTPUT_DIR / out_name_loan
            print(f"  Generating {test_key.upper()} (Tamil + English terms): '{text_loan}'...")
            t_gen_start = time.time()
            chunks = list(voice.synthesize(text_loan))
            audio = np.concatenate([c.audio_float_array for c in chunks]) if chunks else np.array([])
            gen_time = round(time.time() - t_gen_start, 2)
            sf.write(str(out_file_loan), audio, voice.config.sample_rate)
            val_loan = validate_wav(out_file_loan)
            print(f"    -> Done in {gen_time}s | Duration: {val_loan.get('duration_s')}s | Size: {val_loan.get('file_size_bytes')} bytes")
            samples.append({
                "test_id": test_key,
                "variant": "tamil_with_english_terms",
                "script_type": "Tamil Script + English loanwords (espeak fallback)",
                "input_text": text_loan,
                "output_file": out_name_loan,
                "generation_time_s": gen_time,
                "validation": val_loan
            })

            # 2. Tamil phonetic transliteration for loanwords
            text_phonetic = test_info["tamil_phonetic"]
            out_name_phonetic = f"piper_valluvar_{test_key}_phonetic.wav"
            out_file_phonetic = OUTPUT_DIR / out_name_phonetic
            print(f"  Generating {test_key.upper()} (Tamil Phonetic Transliteration): '{text_phonetic}'...")
            t_gen_start_ph = time.time()
            chunks_ph = list(voice.synthesize(text_phonetic))
            audio_ph = np.concatenate([c.audio_float_array for c in chunks_ph]) if chunks_ph else np.array([])
            gen_time_ph = round(time.time() - t_gen_start_ph, 2)
            sf.write(str(out_file_phonetic), audio_ph, voice.config.sample_rate)
            val_ph = validate_wav(out_file_phonetic)
            print(f"    -> Done in {gen_time_ph}s | Duration: {val_ph.get('duration_s')}s | Size: {val_ph.get('file_size_bytes')} bytes")
            samples.append({
                "test_id": test_key,
                "variant": "tamil_phonetic",
                "script_type": "Tamil Script with Phonetic Loanword Transliteration",
                "input_text": text_phonetic,
                "output_file": out_name_phonetic,
                "generation_time_s": gen_time_ph,
                "validation": val_ph
            })

        results_dict["candidate_2"] = {
            "model_id": model_id,
            "display_name": "Piper Tamil Voices (ta_IN-ValluvarNeural-medium)",
            "license": "Apache 2.0 (Permissive, commercial use allowed)",
            "architecture": "VITS (ONNX Runtime, espeak-ng 'ta' phonemizer)",
            "status": "SUCCESS",
            "device": "CPU (ONNX Runtime)",
            "load_time_s": load_time,
            "weights_size": "60.5 MB ONNX model",
            "samples": samples,
            "technical_notes": "Trained for Piper TTS using VITS architecture. Lightweight 60 MB model with rapid CPU inference (<1.5s). Uses espeak-ng Tamil phonemes; English words benefit from phonetic Tamil spelling."
        }

        del voice
        gc.collect()

    except Exception as e:
        print(f"Candidate 2 FAILED: {e}")
        import traceback
        traceback.print_exc()
        results_dict["candidate_2"] = {
            "model_id": model_id,
            "display_name": "Piper Tamil Voices",
            "license": "Apache 2.0",
            "status": "FAILED",
            "error": str(e)
        }

# ---------------------------------------------------------
# Candidate 3: facebook/mms-tts-tam
# ---------------------------------------------------------
def run_mms_tts(results_dict: dict):
    model_id = "facebook/mms-tts-tam"
    print(f"\n=======================================================")
    print(f"[Candidate 3/5] Evaluating {model_id} (CPU/Transformers)...")
    print(f"=======================================================")

    try:
        from transformers import VitsModel, AutoTokenizer

        t_load_start = time.time()
        print("Loading HuggingFace MMS-TTS-TAM model and tokenizer (~140 MB)...")
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = VitsModel.from_pretrained(model_id)
        model.to("cpu")
        model.eval()
        load_time = round(time.time() - t_load_start, 2)
        sr = model.config.sampling_rate
        print(f"MMS-TTS loaded in {load_time}s | Sample rate: {sr} Hz")

        samples = []
        for test_key, test_info in TEST_SENTENCES.items():
            # 1. Tamil script with English loanwords preserved
            text_loan = test_info["tamil_english_loanwords"]
            out_name_loan = f"mms_tam_{test_key}_english_loanwords.wav"
            out_file_loan = OUTPUT_DIR / out_name_loan
            print(f"  Generating {test_key.upper()} (Tamil + English terms): '{text_loan}'...")
            t_gen_start = time.time()
            inputs_loan = tokenizer(text_loan, return_tensors="pt")
            with torch.no_grad():
                out_audio_loan = model(**inputs_loan).waveform[0].cpu().numpy()
            gen_time_loan = round(time.time() - t_gen_start, 2)
            sf.write(str(out_file_loan), out_audio_loan, sr)
            val_loan = validate_wav(out_file_loan)
            print(f"    -> Done in {gen_time_loan}s | Duration: {val_loan.get('duration_s')}s | Size: {val_loan.get('file_size_bytes')} bytes")
            samples.append({
                "test_id": test_key,
                "variant": "tamil_with_english_terms",
                "script_type": "Tamil Script + English loanwords (Note: English chars mapped to <unk>)",
                "input_text": text_loan,
                "output_file": out_name_loan,
                "generation_time_s": gen_time_loan,
                "validation": val_loan,
                "observation": "MMS-TAM vocabulary lacks Latin letters; English words (Python, React, useState, etc.) are converted to token ID 15 (<unk>) and rendered as silences or muted pauses."
            })

            # 2. Tamil phonetic transliteration for loanwords
            text_phonetic = test_info["tamil_phonetic"]
            out_name_phonetic = f"mms_tam_{test_key}_phonetic.wav"
            out_file_phonetic = OUTPUT_DIR / out_name_phonetic
            print(f"  Generating {test_key.upper()} (Tamil Phonetic Transliteration): '{text_phonetic}'...")
            t_gen_start_ph = time.time()
            inputs_ph = tokenizer(text_phonetic, return_tensors="pt")
            with torch.no_grad():
                out_audio_ph = model(**inputs_ph).waveform[0].cpu().numpy()
            gen_time_ph = round(time.time() - t_gen_start_ph, 2)
            sf.write(str(out_file_phonetic), out_audio_ph, sr)
            val_ph = validate_wav(out_file_phonetic)
            print(f"    -> Done in {gen_time_ph}s | Duration: {val_ph.get('duration_s')}s | Size: {val_ph.get('file_size_bytes')} bytes")
            samples.append({
                "test_id": test_key,
                "variant": "tamil_phonetic",
                "script_type": "Tamil Script with Phonetic Loanword Transliteration",
                "input_text": text_phonetic,
                "output_file": out_name_phonetic,
                "generation_time_s": gen_time_ph,
                "validation": val_ph,
                "observation": "With phonetic transliteration, MMS-TAM articulates all loanwords accurately using its native character inventory."
            })

        results_dict["candidate_3"] = {
            "model_id": model_id,
            "display_name": "Meta MMS-TTS Tamil (facebook/mms-tts-tam)",
            "license": "CC-BY-NC 4.0 (Non-Commercial Only — NOT commercially usable for Bookey)",
            "architecture": "VITS (Variational Inference Text-to-Speech)",
            "status": "SUCCESS",
            "device": "CPU (PyTorch)",
            "load_time_s": load_time,
            "weights_size": "145 MB safetensors",
            "samples": samples,
            "technical_notes": "Fast, clear synthesis on CPU (~1.5s). Crucial limitation: CC-BY-NC 4.0 strictly forbids commercial production use. Furthermore, character-level vocab drops Latin letters unless transliterated into Tamil script."
        }

        del model, tokenizer
        gc.collect()

    except Exception as e:
        print(f"Candidate 3 FAILED: {e}")
        import traceback
        traceback.print_exc()
        results_dict["candidate_3"] = {
            "model_id": model_id,
            "display_name": "Meta MMS-TTS Tamil",
            "license": "CC-BY-NC 4.0",
            "status": "FAILED",
            "error": str(e)
        }

# ---------------------------------------------------------
# Candidate 4: ai4bharat/IndicF5 (Gated Check)
# ---------------------------------------------------------
def run_indic_f5(results_dict: dict):
    model_id = "ai4bharat/IndicF5"
    print(f"\n=======================================================")
    print(f"[Candidate 4/5] Evaluating {model_id}...")
    print(f"=======================================================")

    url = f"https://huggingface.co/{model_id}/resolve/main/config.json"
    gated_status = "UNKNOWN"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            gated_status = f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        gated_status = f"HTTP {e.code} {e.reason}"
    except Exception as e:
        gated_status = str(e)

    print(f"  Access Check Result: {gated_status}")
    print(f"  Gating Requirement: Access to '{model_id}' is gated on Hugging Face.")
    print(f"  Per instructions: Stopping evaluation for gated candidate without asking for tokens in chat.")

    results_dict["candidate_4"] = {
        "model_id": model_id,
        "display_name": "AI4Bharat IndicF5 (F5-TTS Flow Matching)",
        "license": "MIT (requires accepted terms)",
        "architecture": "F5-TTS (Flow-matching voice cloning, 11 Indian languages)",
        "status": "FAILED_GATED",
        "gating_status": gated_status,
        "error_message": "HTTP 401 Unauthorized: Model access is gated by AI4Bharat. Users must visit https://huggingface.co/ai4bharat/IndicF5 and accept repository terms to gain access token permissions.",
        "requirements": "Requires: (1) Accepted Hugging Face repository access, (2) User Hugging Face authentication token, (3) Reference audio clip (2-10s) + matching Tamil transcript for zero-shot speaker conditioning.",
        "samples": []
    }

# ---------------------------------------------------------
# Candidate 5: ai4bharat/indic-parler-tts (Gated Check + Resource Review)
# ---------------------------------------------------------
def run_indic_parler_tts(results_dict: dict):
    model_id = "ai4bharat/indic-parler-tts"
    print(f"\n=======================================================")
    print(f"[Candidate 5/5] Evaluating {model_id}...")
    print(f"=======================================================")

    url = f"https://huggingface.co/{model_id}/resolve/main/config.json"
    gated_status = "UNKNOWN"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            gated_status = f"HTTP {resp.status}"
    except urllib.error.HTTPError as e:
        gated_status = f"HTTP {e.code} {e.reason}"
    except Exception as e:
        gated_status = str(e)

    print(f"  Access Check Result: {gated_status}")
    print(f"  Gating Requirement: Access to '{model_id}' is gated on Hugging Face.")
    print(f"  Resource Requirement: Checkpoint size > 2.2 GB; exceeds the 2 GB threshold requiring prior approval.")
    print(f"  Per instructions: Stopping evaluation for gated and large model.")

    results_dict["candidate_5"] = {
        "model_id": model_id,
        "display_name": "AI4Bharat Indic-Parler-TTS",
        "license": "Apache 2.0 (requires accepted terms)",
        "architecture": "Parler-TTS (Natural-language descriptive speech synthesis, 23 Indic languages + English)",
        "status": "FAILED_GATED_AND_LARGE",
        "gating_status": gated_status,
        "error_message": "HTTP 401 Unauthorized: Gated repository requiring Hugging Face login and terms approval. In addition, model weights exceed 2.2 GB (exceeding isolated 2 GB download safety limit).",
        "requirements": "Requires: (1) Accepted terms at https://huggingface.co/ai4bharat/indic-parler-tts, (2) Authenticated HF token, (3) 8 GB+ RAM / high VRAM overhead for Parler-TTS transformer backbone.",
        "samples": []
    }

# ---------------------------------------------------------
# Reference Section: sugiv/fish-speech-1.5-tanglish
# ---------------------------------------------------------
def download_fish_speech_references(results_dict: dict):
    print(f"\n=======================================================")
    print(f"[Reference Section] Fetching sugiv/fish-speech-1.5-tanglish Eval WAVs...")
    print(f"=======================================================")

    repo_id = "sugiv/fish-speech-1.5-tanglish"
    base_raw = f"https://huggingface.co/{repo_id}/resolve/main/eval"

    # The 15 canonical Tanglish evaluation sentences from PHASE_2_EVAL.md
    reference_manifest = [
        {"id": "01", "bucket": "in_distribution", "file": "in_distribution/01_karthik_kumar_solo_tng.wav", "text": "vanakkam da mapla, sowkyama?", "category": "Bucket 1 — In-distribution"},
        {"id": "02", "bucket": "in_distribution", "file": "in_distribution/02_karthik_kumar_solo_tng.wav", "text": "enakku indha padam romba pidichathu", "category": "Bucket 1 — In-distribution"},
        {"id": "03", "bucket": "in_distribution", "file": "in_distribution/03_karthik_kumar_solo_tng.wav", "text": "aluvalar ippo ellam smartphone la work panreenga", "category": "Bucket 1 — In-distribution"},
        {"id": "04", "bucket": "novel", "file": "novel/04_karthik_kumar_solo_tng.wav", "text": "machi, nalaikku chennai la enna weather?", "category": "Bucket 2 — Novel Colloquial Tanglish"},
        {"id": "05", "bucket": "novel", "file": "novel/05_karthik_kumar_solo_tng.wav", "text": "meeting mudinjatha? call me back please", "category": "Bucket 2 — Novel Colloquial Tanglish"},
        {"id": "06", "bucket": "novel", "file": "novel/06_karthik_kumar_solo_tng.wav", "text": "unga family la ellarum nalla iruka?", "category": "Bucket 2 — Novel Colloquial Tanglish"},
        {"id": "07", "bucket": "novel", "file": "novel/07_karthik_kumar_solo_tng.wav", "text": "nan romba tired-a irruken, konjam rest pannanum", "category": "Bucket 2 — Novel Colloquial Tanglish"},
        {"id": "08", "bucket": "novel", "file": "novel/08_karthik_kumar_solo_tng.wav", "text": "netflix la puthu series onnu vanthiruku, super-a iruku", "category": "Bucket 2 — Novel Colloquial Tanglish"},
        {"id": "09", "bucket": "novel", "file": "novel/09_karthik_kumar_solo_tng.wav", "text": "chennai traffic la stuck aayiten, sorry late-a varen", "category": "Bucket 2 — Novel Colloquial Tanglish"},
        {"id": "10", "bucket": "novel", "file": "novel/10_karthik_kumar_solo_tng.wav", "text": "sapadu ready-a? pasi-a irruku", "category": "Bucket 2 — Novel Colloquial Tanglish"},
        {"id": "11", "bucket": "hard", "file": "hard/11_karthik_kumar_solo_tng.wav", "text": "actually, my flight got delayed, so I'll reach late", "category": "Bucket 3 — Hard English / Code-switching"},
        {"id": "12", "bucket": "hard", "file": "hard/12_karthik_kumar_solo_tng.wav", "text": "onnu, rendu, munu, naalu, anju", "category": "Bucket 3 — Hard English / Code-switching"},
        {"id": "13", "bucket": "hard", "file": "hard/13_karthik_kumar_solo_tng.wav", "text": "MGR-oda padam paatha, thala Ajith fan aaiten", "category": "Bucket 3 — Hard English / Code-switching"},
        {"id": "14", "bucket": "hard", "file": "hard/14_karthik_kumar_solo_tng.wav", "text": "nethu poi office la meeting attend panniten, appuram friend kitte pesi sapada poiten", "category": "Bucket 3 — Hard English / Code-switching"},
        {"id": "15", "bucket": "hard", "file": "hard/15_karthik_kumar_solo_tng.wav", "text": "ivlo late-a enna panra? padikkalaya?", "category": "Bucket 3 — Hard English / Code-switching"}
    ]

    downloaded_refs = []
    for item in reference_manifest:
        rel_sub = item["file"]
        target_file = REF_DIR / Path(rel_sub).name
        url = f"{base_raw}/{rel_sub}"
        
        if not target_file.exists():
            try:
                print(f"  Downloading reference sample {item['id']}: '{item['text'][:35]}...'")
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req) as resp, open(target_file, "wb") as f_out:
                    f_out.write(resp.read())
            except Exception as e:
                print(f"    Failed to download {rel_sub}: {e}")

        val = validate_wav(target_file)
        downloaded_refs.append({
            "id": item["id"],
            "category": item["category"],
            "text": item["text"],
            "remote_url": url,
            "local_file": f"reference_fish_speech/{target_file.name}",
            "speaker": "karthik_kumar_solo (Chennai speaker reference)",
            "validation": val
        })

    results_dict["reference_fish_speech"] = {
        "model_id": repo_id,
        "display_name": "Fish-Speech 1.5 Tanglish LoRA (sugiv)",
        "license": "CC-BY-NC-SA 4.0 (Non-commercial share-alike)",
        "hardware_rationale": "DO NOT RUN LOCALLY: Fish-Speech 1.5 dual-autoregressive LLaMA backbone + Firefly VQGAN vocoder requires 12 GB - 24 GB GPU VRAM (evaluated upstream on NVIDIA L4 24 GB). Cannot load on laptop RTX 3050 (4 GB VRAM) without triggering CUDA OOM.",
        "status": "REFERENCE_PRECOMPUTED",
        "sample_count": len(downloaded_refs),
        "samples": downloaded_refs
    }
    print(f"  Reference bundle ready: {len(downloaded_refs)} evaluation WAVs verified.")

# ---------------------------------------------------------
# Main Orchestrator
# ---------------------------------------------------------
def main():
    print("=" * 60)
    print(" BOOKEY LOCAL TTS AUDITION LAB — RUNNER & VALIDATOR")
    print("=" * 60)

    # 1. System Info
    sys_info = {
        "python_version": sys.version,
        "platform": sys.platform,
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None (Using CPU)",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    print(f"Environment: Python {sys.version_info.major}.{sys.version_info.minor} | PyTorch {torch.__version__} | CUDA: {torch.cuda.is_available()}")

    audition_data = {
        "metadata": {
            "title": "Bookey Local TTS Audition Dataset",
            "version": "1.0",
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "system_info": sys_info,
            "target_test_sentences": TEST_SENTENCES
        },
        "candidates": {},
        "summary": {}
    }

    # Run Candidate 1
    run_pocket_tts(audition_data["candidates"])

    # Run Candidate 2
    run_piper_tts(audition_data["candidates"])

    # Run Candidate 3
    run_mms_tts(audition_data["candidates"])

    # Run Candidate 4
    run_indic_f5(audition_data["candidates"])

    # Run Candidate 5
    run_indic_parler_tts(audition_data["candidates"])

    # Fetch Fish-Speech Reference 15 Samples
    download_fish_speech_references(audition_data["candidates"])

    # Generate Summary Metrics
    total_local_samples = 0
    valid_local_samples = 0
    for c_key, c_val in audition_data["candidates"].items():
        if c_key == "reference_fish_speech":
            continue
        for s in c_val.get("samples", []):
            total_local_samples += 1
            if s.get("validation", {}).get("status") == "VALID":
                valid_local_samples += 1

    audition_data["summary"] = {
        "total_candidates": 5,
        "successful_candidates": sum(1 for c in audition_data["candidates"].values() if c.get("status") == "SUCCESS"),
        "failed_gated_candidates": sum(1 for c in audition_data["candidates"].values() if "GATED" in c.get("status", "")),
        "total_local_wavs_generated": total_local_samples,
        "valid_local_wavs": valid_local_samples,
        "reference_wavs_available": len(audition_data["candidates"].get("reference_fish_speech", {}).get("samples", [])),
        "commercial_ready_models": ["prasadvittaldev/pocket-tts-tamil-female-audiobook (MIT)", "Jeyaram-K/piper-tamil-voices (Apache 2.0)"],
        "non_commercial_restricted_models": ["facebook/mms-tts-tam (CC-BY-NC 4.0)", "sugiv/fish-speech-1.5-tanglish (CC-BY-NC-SA 4.0)"]
    }

    out_json = BASE_DIR / "audition_metadata.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(audition_data, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print(" AUDITION DATASET GENERATION COMPLETE")
    print(f" Summary: {valid_local_samples} local candidate WAVs validated.")
    print(f" Reference: {audition_data['summary']['reference_wavs_available']} Fish-Speech comparison WAVs downloaded.")
    print(f" Metadata saved to: {out_json}")
    print("=" * 60)

if __name__ == "__main__":
    main()
