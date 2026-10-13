"""
IqraBook — Gemini API Client
Gemini Flash: teaching content streaming + TTS + audio understanding + embeddings
All async. Token optimization: max_tokens set per call type.
"""
import logging
import asyncio
from typing import AsyncGenerator
import httpx

logger = logging.getLogger(__name__)

# Model names
MODEL_FLASH   = "gemini-2.0-flash"
MODEL_EMBED   = "text-embedding-004"
MODEL_TTS     = "gemini-2.5-flash-preview-tts"

GEMINI_BASE   = "https://generativelanguage.googleapis.com/v1beta"


class GeminiClient:
    """Async Gemini client — streaming text, TTS, embeddings."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self._headers = {"Content-Type": "application/json"}

    # ── Text streaming ────────────────────────────────────────────

    async def generate_text_stream(
        self, prompt: str, system: str = ""
    ) -> AsyncGenerator[str, None]:
        """
        Stream lesson content from Gemini Flash.
        Token optimization: max_output_tokens=400 per chunk.
        Latency: ~300ms TTFT.
        """
        url = f"{GEMINI_BASE}/models/{MODEL_FLASH}:streamGenerateContent?alt=sse&key={self.api_key}"

        body: dict = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": 400,
                "temperature": 0.7,
            },
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream("POST", url, json=body, headers=self._headers) as resp:
                    resp.raise_for_status()
                    buffer = ""
                    async for raw_line in resp.aiter_lines():
                        line = raw_line.strip()
                        if not line or line == "data: [DONE]":
                            continue
                        if line.startswith("data: "):
                            line = line[6:]
                        try:
                            import json
                            obj = json.loads(line)
                            candidates = obj.get("candidates", [])
                            for cand in candidates:
                                parts = cand.get("content", {}).get("parts", [])
                                for part in parts:
                                    text = part.get("text", "")
                                    if text:
                                        yield text
                        except Exception:
                            continue
        except Exception as e:
            logger.error(f"Gemini stream error: {e}")
            yield f"Maafi — oru error vanduchu: {e}"

    # ── TTS ───────────────────────────────────────────────────────

    async def generate_tts_audio(self, text: str) -> bytes:
        """
        Generate speech using Gemini TTS model.
        Returns raw audio bytes (PCM/WAV).
        Voice: Kore (warm, natural). Language: auto-detected (Tamil+English).
        """
        url = f"{GEMINI_BASE}/models/{MODEL_TTS}:generateContent?key={self.api_key}"

        body = {
            "contents": [{"parts": [{"text": text}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {"voiceName": "Kore"}
                    }
                },
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, json=body, headers=self._headers)
                resp.raise_for_status()
                data = resp.json()

            # Extract inline audio data
            import base64
            candidates = data.get("candidates", [])
            for cand in candidates:
                parts = cand.get("content", {}).get("parts", [])
                for part in parts:
                    inline = part.get("inlineData", {})
                    if inline.get("data"):
                        return base64.b64decode(inline["data"])

            logger.warning("TTS: no audio data in response")
            return b""

        except Exception as e:
            logger.error(f"Gemini TTS error: {e}")
            return b""

    # ── Audio understanding (fallback STT) ────────────────────────

    async def process_audio_input(self, audio_bytes: bytes, context: str = "") -> str:
        """
        Fallback STT using Gemini native audio understanding.
        Used when Groq Whisper fails (rate limit, etc.).
        """
        import base64
        url = f"{GEMINI_BASE}/models/{MODEL_FLASH}:generateContent?key={self.api_key}"

        audio_b64 = base64.b64encode(audio_bytes).decode()
        body = {
            "contents": [{
                "parts": [
                    {"text": f"Transcribe this audio exactly. Context: {context[:100]}"},
                    {"inlineData": {"mimeType": "audio/webm", "data": audio_b64}},
                ]
            }],
            "generationConfig": {"maxOutputTokens": 200},
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, json=body, headers=self._headers)
                resp.raise_for_status()
                data = resp.json()

            candidates = data.get("candidates", [])
            for cand in candidates:
                parts = cand.get("content", {}).get("parts", [])
                for part in parts:
                    if part.get("text"):
                        return part["text"].strip()
            return ""

        except Exception as e:
            logger.error(f"Gemini audio fallback error: {e}")
            return ""

    # ── Embeddings ────────────────────────────────────────────────

    async def generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding vector for RAG similarity search.
        Model: text-embedding-004 (768 dims).
        Token cost: ~1 token per 4 chars. 800-char chunks ≈ 200 tokens each.
        """
        url = f"{GEMINI_BASE}/models/{MODEL_EMBED}:embedContent?key={self.api_key}"

        body = {
            "model": f"models/{MODEL_EMBED}",
            "content": {"parts": [{"text": text[:2000]}]},  # safety limit
        }

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.post(url, json=body, headers=self._headers)
                resp.raise_for_status()
                data = resp.json()

            return data.get("embedding", {}).get("values", [])

        except Exception as e:
            logger.error(f"Gemini embedding error: {e}")
            # Return zero vector on failure (ChromaDB still works)
            return [0.0] * 768
