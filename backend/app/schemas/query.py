"""Request / response models for the query endpoint."""
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import ProviderName


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000, description="Question in plain English")
    provider: ProviderName | None = Field(None, description="LLM provider; defaults to the server setting")
    max_retries: int | None = Field(None, ge=0, le=10, description="Overrides the server retry limit")

    @field_validator("question")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Question must be at least 3 characters long")
        return value

    model_config = ConfigDict(
        json_schema_extra={"example": {"question": "Top 5 customers by total spend", "provider": "groq"}}
    )


class GeneratedSQL(BaseModel):
    """What we expect the LLM to return."""

    sql: str | None = None
    explanation: str | None = None


class AttemptLog(BaseModel):
    attempt: int
    sql: str | None = None
    error: str | None = None
    success: bool = False
    duration_ms: float = 0.0


class QueryResult(BaseModel):
    columns: list[str] = Field(default_factory=list)
    rows: list[list[Any]] = Field(default_factory=list)
    row_count: int = 0
    truncated: bool = False


class QueryResponse(BaseModel):
    success: bool
    question: str
    sql: str | None = None
    explanation: str | None = None
    answer: str | None = None
    columns: list[str] = Field(default_factory=list)
    rows: list[list[Any]] = Field(default_factory=list)
    row_count: int = 0
    truncated: bool = False
    attempts: list[AttemptLog] = Field(default_factory=list)
    provider: str
    model: str
    error: str | None = None
    execution_time_ms: float = 0.0
