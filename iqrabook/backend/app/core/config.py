from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    GEMINI_API_KEY: str = Field(default="")
    GROQ_API_KEY: str = Field(default="")
    JDOODLE_CLIENT_ID: str = Field(default="")
    JDOODLE_CLIENT_SECRET: str = Field(default="")
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./iqrabook.db")
    FRONTEND_URL: str = Field(default="http://localhost:3000")
    CHROMA_PERSIST_DIR: str = Field(default="./chroma_db")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
