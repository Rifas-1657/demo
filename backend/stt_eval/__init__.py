"""
backend/stt_eval — STT evaluation harness for Tanglish accuracy measurement.

Measures:
- WER (Word Error Rate)
- CER (Character Error Rate)
- Python-term recall (did expected terms appear in transcript)
- Language detection accuracy
- Latency per second of audio
- Failure rate

Outputs JSON results and readable markdown tables.
"""
