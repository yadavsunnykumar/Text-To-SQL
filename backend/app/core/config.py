"""Application settings, loaded from environment variables / .env via pydantic-settings."""
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # .../backend
DEFAULT_SQLITE_PATH = BASE_DIR / "data" / "sample.db"

ProviderName = Literal["openai", "groq"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API
    app_name: str = "Text-to-SQL Analyst"
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:4200"]
    log_level: str = "INFO"

    # Database
    database_url: str = ""

    # LLM
    llm_provider: ProviderName = "groq"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"
    llm_temperature: float = Field(0.0, ge=0.0, le=2.0)

    # Behaviour
    max_retries: int = Field(3, ge=0, le=10)
    max_rows: int = Field(500, ge=1, le=10_000)
    sample_rows_in_prompt: int = Field(3, ge=0, le=20)
    generate_answer: bool = True

    @field_validator("openai_api_key", "groq_api_key", mode="before")
    @classmethod
    def _empty_to_none(cls, value: str | None) -> str | None:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @property
    def resolved_database_url(self) -> str:
        return self.database_url or f"sqlite:///{DEFAULT_SQLITE_PATH}"

    @property
    def uses_default_sqlite(self) -> bool:
        return not self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
