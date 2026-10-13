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
    model_config = SettingsConfigDict(
        env_file=".env",
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


    # =========================================================
    # B4: Tutor agent
    # =========================================================
    tutor_history_window: int = 3       # last N exchanges in context
    tutor_max_answer_tokens: int = 800

    # =========================================================
    # B5: Voice (STT + TTS)
    # =========================================================
    # STT
    groq_whisper_model: str = "whisper-large-v3-turbo"
    faster_whisper_model: str = "large-v3-turbo"

    # TTS
    edge_tts_voice: str = "ta-IN-ValluvarNeural"
    audio_cache_dir: str = "./audio_cache"
    voice_enabled: bool = True
    tts_first_sentence_only: bool = True  # start playback after first sentence

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
