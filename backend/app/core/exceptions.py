"""Domain exceptions. Routes translate these into HTTP responses in app.main."""


class AppError(Exception):
    """Base class for all application errors."""

    status_code: int = 500

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class ProviderNotConfiguredError(AppError):
    """The requested LLM provider has no API key configured."""

    status_code = 400


class LLMProviderError(AppError):
    """The LLM API call itself failed (network, auth, rate limit...)."""

    status_code = 502


class LLMResponseError(AppError):
    """The LLM answered, but not in a format we could use."""

    status_code = 502


class UnsafeQueryError(AppError):
    """Generated SQL is not a single read-only statement."""

    status_code = 400


class QueryExecutionError(AppError):
    """The database rejected the query."""

    status_code = 400
