"""
app/config.py â€” pydantic-settings configuration.
All values have safe defaults so the server starts with no .env file (dev/test).
"""
from __future__ import annotations

import secrets
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Skip reading the .env file when APP_ENV=testing so that a malformed
    # .env (e.g. bad CORS_ORIGINS syntax) never blocks the test runner.
    # All test values are supplied via environment variable overrides.
    _env_file = ".env" if __import__("os").environ.get("APP_ENV") != "testing" else None

    model_config = SettingsConfigDict(
        env_file=".env" if __import__("os").environ.get("APP_ENV") != "testing" else None,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_env: Literal["development", "testing", "production"] = "development"
    debug: bool = True

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000

    # --- Database ---
    # SQLite for dev/tests; PostgreSQL for production (same SQLAlchemy models).
    database_url: str = Field(
        default="sqlite+aiosqlite:///./bookey_dev.db",
        description="Async SQLAlchemy URL. Use postgresql+asyncpg://... for production.",
    )
    db_echo: bool = False

    # --- Auth ---
    # IMPORTANT: override SECRET_KEY in production with a long random value!
    secret_key: str = Field(
        default_factory=lambda: secrets.token_hex(32),
        description="JWT signing key. Set SECRET_KEY env var in production.",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # --- CORS ---
    # Comma-separated list of allowed origins, or set as a JSON list in env
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:4100",
        "http://127.0.0.1:3000",
    ]

    # --- WebSocket ---
    ws_heartbeat_interval: int = 30  # seconds
    ws_heartbeat_timeout: int = 10   # seconds after ping with no pong
    ws_max_message_size: int = 1024 * 512  # 512 KB
    ws_auth_timeout: float = 5.0  # seconds to send auth_ticket before socket is closed

    # --- Protocol ---
    book_protocol_version: int = 2  # bumped to v2 in B1

    # --- MockBookService timing (ms) ---
    mock_token_ms: int = 85          # delay between word tokens
    mock_thinking_ms: int = 600      # tutor "thinking" pause
    mock_answer_token_ms: int = 45   # delay between answer tokens
    mock_code_stream_ms: int = 30    # delay between code stream chunks

    # --- Rate limiting ---
    rate_limit_per_minute: int = 60  # per IP default
    rate_limit_auth_per_minute: int = 10  # stricter on auth endpoints

    # --- SMTP (optional â€” required for production password reset) ---
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@bookey.app"

    # =========================================================
    # B2: Knowledge base
    # =========================================================
    max_document_size_bytes: int = 25 * 1024 * 1024
    storage_backend: str = "local"
    storage_local_root: str = "./uploads"
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "auto"
    s3_endpoint_url: str = ""
    embedding_backend: str = "mock"
    embedding_batch_size: int = 32
    embedding_device: str = "auto"
    vector_store: str = "chroma"
    chroma_persist_dir: str = "./chroma_db"
    retrieval_top_k: int = 5
    retrieval_score_threshold: float = 0.0
    retrieval_mmr_lambda: float = 0.7


    # =========================================================
    # B3: LLM Router + Page Generator
    # =========================================================

    # --- LLM Providers (comma-ordered fallback list) ---
    llm_providers: str = "gemini,groq,openrouter,mock"
    llm_retry_per_provider: int = 2
    llm_backoff_base_s: float = 1.0

    # --- Gemini ---
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # --- Groq ---
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # --- OpenRouter ---
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.1-70b-instruct"

    # --- Page generator ---
    page_min_words: int = 60
    page_max_words: int = 300
    page_max_tokens: int = 8192
    page_gen_max_repair_attempts: int = 2
    
    # --- LLM Usage Limits ---
    llm_daily_token_limit: int = 1_000_000  # Total tokens per day (0 = no limit)
    llm_page_generation_cap: int = 50  # Max pages to generate in one run


    # =========================================================
    # B4: Tutor agent
    # =========================================================
    tutor_history_window: int = 3       # last N exchanges in context
    tutor_max_answer_tokens: int = 800

    # =========================================================
    # B5: Voice (STT + TTS)
    # =========================================================
    # Providers
    tts_provider: str = "bodhan"        # bodhan, gemini, edge, silent
    stt_provider: str = "local"         # local, groq

    # STT (Local Faster-Whisper & Groq Whisper)
    faster_whisper_model: str = "large-v3-turbo"
    faster_whisper_compute_type: str = "int8"  # int8, int8_float16, float16, float32
    bookey_stt_model: str = "whisper-large-v3-turbo"
    groq_whisper_model: str = "whisper-large-v3-turbo"
    
    # STT: Language Handling
    stt_language_mode: str = "auto"  # auto, forced_ta, forced_en, two_pass
    stt_forced_language: str = "ta"  # used when mode is forced_ta or forced_en
    
    # STT: Advanced Options
    stt_vad_filter: bool = True
    stt_beam_size: int = 5
    stt_temperature: float = 0.0  # 0.0 = greedy, >0 = sampling with fallback
    stt_no_speech_threshold: float = 0.6
    stt_compression_ratio_threshold: float = 2.4
    stt_log_prob_threshold: float = -1.0
    
    # STT: Post-correction
    stt_correction_enabled: bool = True
    stt_correction_provider: str = "gemini"  # llm provider for correction

    # TTS: Bodhan Indic-Speak
    bodhan_api_key: str = ""
    bodhan_tts_model: str = "indic-speak"
    bodhan_tts_voice: str = "Anitha"
    bodhan_tts_lang: str = "ta"
    bodhan_tts_style: str = "educational lecture"

    # TTS: Gemini 3.8 Flash TTS & Edge
    bookey_tts_model: str = "gemini-3.8-flash-tts"
    bookey_tts_voice: str = "Puck"
    bookey_tts_style: str = "clear, warm, patient teaching style"
    edge_tts_voice: str = "ta-IN-ValluvarNeural"

    # TTS: ElevenLabs
    elevenlabs_api_keys: str = ""  # comma-separated ordered keys
    elevenlabs_voice_id: str = ""
    elevenlabs_model_id: str = "eleven_turbo_v2_5"
    elevenlabs_output_format: str = "mp3_44100_128"
    elevenlabs_credits_per_key: int = 10000
    elevenlabs_credits_per_char: float = 1.0
    elevenlabs_stability: float = 0.5
    elevenlabs_similarity_boost: float = 0.75
    elevenlabs_style: float = 0.0
    elevenlabs_use_speaker_boost: bool = True
    elevenlabs_max_credits_per_run: int = 50000
    elevenlabs_daily_cap: int = 100000

    # Audio Cache
    audio_cache_dir: str = "./.cache/bookey-voice"
    voice_enabled: bool = True
    tts_first_sentence_only: bool = True  # start playback after first sentence

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
