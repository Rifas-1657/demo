import logging
from app.core.groq_client import GroqClient
from app.core.gemini_client import GeminiClient

logger = logging.getLogger(__name__)

class IqraSTT:
    """Unified STT wrapper trying Groq first, falling back to Gemini."""

    def __init__(self, groq_client: GroqClient, gemini_client: GeminiClient):
        """Initialize with both clients."""
        self.groq_client = groq_client
        self.gemini_client = gemini_client

    async def transcribe(self, audio_bytes: bytes) -> str:
        """Transcribe audio bytes to text."""
        try:
            logger.info("Attempting STT with Groq...")
            text = await self.groq_client.transcribe_audio(audio_bytes)
            return text
        except Exception as groq_error:
            logger.warning(f"Groq STT failed: {groq_error}. Falling back to Gemini...")
            try:
                text = await self.gemini_client.process_audio_input(audio_bytes, context="Transcribe the user's speech clearly.")
                return text
            except Exception as gemini_error:
                logger.error(f"Gemini STT fallback also failed: {gemini_error}")
                raise RuntimeError("All STT services failed") from gemini_error
