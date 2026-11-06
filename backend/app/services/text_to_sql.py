"""Orchestrates: question -> LLM writes SQL -> validate -> execute -> (on error) retry -> answer."""
import logging
import time
from typing import TYPE_CHECKING

from app.core.exceptions import LLMProviderError, LLMResponseError, QueryExecutionError, UnsafeQueryError
from app.schemas.query import AttemptLog, QueryRequest, QueryResponse, QueryResult
from app.services.llm.base import LLMProvider
from app.services.prompts import (
    build_answer_messages,
    build_retry_message,
    build_sql_messages,
    parse_sql_response,
)
from app.services.sql_validator import validate_sql

if TYPE_CHECKING:  # avoid importing SQLAlchemy just for type hints
    from app.services.database import DatabaseService
    from app.services.llm.factory import LLMProviderFactory

logger = logging.getLogger(__name__)

RETRYABLE_ERRORS = (LLMResponseError, UnsafeQueryError, QueryExecutionError)


def _ms_since(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 2)


class TextToSQLService:
    def __init__(
        self,
        database: "DatabaseService",
        llm_factory: "LLMProviderFactory",
        max_retries: int = 3,
        generate_answer: bool = True,
    ):
        self.database = database
        self.llm_factory = llm_factory
        self.max_retries = max_retries
        self.generate_answer = generate_answer

    def ask(self, request: QueryRequest) -> QueryResponse:
        started = time.perf_counter()
        llm = self.llm_factory.get(request.provider)  # raises ProviderNotConfiguredError
        max_retries = self.max_retries if request.max_retries is None else request.max_retries
        dialect = self.database.dialect

        messages = build_sql_messages(
            question=request.question,
            schema=self.database.schema_for_prompt(),
            dialect=dialect,
            max_rows=self.database.max_rows,
        )
        attempts: list[AttemptLog] = []
        last_error: str | None = None
        last_sql: str | None = None

        for attempt_no in range(1, max_retries + 2):  # first try + N retries
            attempt_start = time.perf_counter()
            raw = llm.complete(messages)  # LLMProviderError propagates: retrying won't help
            candidate_sql: str | None = None
            try:
                generated = parse_sql_response(raw)
                candidate_sql = generated.sql
                if not generated.sql:
                    # The model says the question can't be answered from this schema.
                    attempts.append(
                        AttemptLog(attempt=attempt_no, error=generated.explanation, duration_ms=_ms_since(attempt_start))
                    )
                    return self._failure(
                        request, llm, attempts, started,
                        error=generated.explanation or "The question cannot be answered from this database.",
                        explanation=generated.explanation,
                    )
                sql = validate_sql(generated.sql)
                candidate_sql = sql
                result = self.database.execute(sql)
            except RETRYABLE_ERRORS as exc:
                last_error, last_sql = exc.message, candidate_sql
                logger.info("Attempt %s failed: %s", attempt_no, exc.message)
                attempts.append(
                    AttemptLog(attempt=attempt_no, sql=last_sql, error=exc.message, duration_ms=_ms_since(attempt_start))
                )
                messages = [
                    *messages,
                    {"role": "assistant", "content": raw},
                    build_retry_message(last_sql, exc.message, dialect),
                ]
                continue

            attempts.append(
                AttemptLog(attempt=attempt_no, sql=sql, success=True, duration_ms=_ms_since(attempt_start))
            )
            return QueryResponse(
                success=True,
                question=request.question,
                sql=sql,
                explanation=generated.explanation,
                answer=self._answer(llm, request.question, sql, result),
                columns=result.columns,
                rows=result.rows,
                row_count=result.row_count,
                truncated=result.truncated,
                attempts=attempts,
                provider=llm.name,
                model=llm.model,
                execution_time_ms=_ms_since(started),
            )

        return self._failure(
            request, llm, attempts, started,
            error=f"Could not produce a working query after {len(attempts)} attempt(s). Last error: {last_error}",
            sql=last_sql,
        )

    # ----------------------------------------------------------------- helpers
    def _answer(self, llm: LLMProvider, question: str, sql: str, result: QueryResult) -> str | None:
        if not self.generate_answer:
            return None
        try:
            return llm.complete(
                build_answer_messages(question, sql, result.columns, result.rows, result.truncated)
            ).strip()
        except LLMProviderError as exc:
            logger.warning("Answer generation failed: %s", exc.message)
            return None

    @staticmethod
    def _failure(
        request: QueryRequest,
        llm: LLMProvider,
        attempts: list[AttemptLog],
        started: float,
        error: str,
        sql: str | None = None,
        explanation: str | None = None,
    ) -> QueryResponse:
        return QueryResponse(
            success=False,
            question=request.question,
            sql=sql,
            explanation=explanation,
            attempts=attempts,
            provider=llm.name,
            model=llm.model,
            error=error,
            execution_time_ms=_ms_since(started),
        )
