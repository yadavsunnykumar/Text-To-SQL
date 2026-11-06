"""Guards that make sure only a single read-only statement ever reaches the database.

The database layer adds a second line of defence (read-only connection for SQLite,
rolled-back transaction for everything else), but rejecting early gives the LLM a
clear error message to fix on the next retry.
"""
import re

from app.core.exceptions import UnsafeQueryError

FORBIDDEN_KEYWORDS = (
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE",
    "MERGE", "GRANT", "REVOKE", "ATTACH", "DETACH", "PRAGMA", "VACUUM", "REINDEX",
    "EXEC", "EXECUTE", "CALL", "COPY", "INTO", "LOCK", "COMMIT", "ROLLBACK", "SAVEPOINT",
)

_FORBIDDEN_RE = re.compile(r"\b(" + "|".join(FORBIDDEN_KEYWORDS) + r")\b", re.IGNORECASE)
_LINE_COMMENT_RE = re.compile(r"--[^\n]*")
_BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
# 'single quoted' (with '' escapes), "double quoted", `backticks`, [brackets]
_QUOTED_RE = re.compile(r"'(?:[^']|'')*'|\"(?:[^\"]|\"\")*\"|`[^`]*`|\[[^\]]*\]")
_FENCE_RE = re.compile(r"^```(?:sql)?\s*|\s*```$", re.IGNORECASE)


def strip_comments(sql: str) -> str:
    sql = _BLOCK_COMMENT_RE.sub(" ", sql)
    return _LINE_COMMENT_RE.sub(" ", sql)


def _mask_quoted(sql: str) -> str:
    """Replace quoted strings / identifiers with a placeholder so keywords inside them are ignored."""
    return _QUOTED_RE.sub("''", sql)


def clean_sql(sql: str) -> str:
    """Normalise LLM output: drop markdown fences, comments, whitespace and trailing semicolons."""
    sql = _FENCE_RE.sub("", sql.strip())
    sql = strip_comments(sql).strip()
    while sql.endswith(";"):
        sql = sql[:-1].rstrip()
    return sql


def validate_sql(sql: str | None) -> str:
    """Return a cleaned, read-only SQL statement or raise UnsafeQueryError."""
    if not sql or not sql.strip():
        raise UnsafeQueryError("The generated SQL is empty.")

    cleaned = clean_sql(sql)
    if not cleaned:
        raise UnsafeQueryError("The generated SQL is empty.")

    masked = _mask_quoted(cleaned)

    if ";" in masked:
        raise UnsafeQueryError("Only a single SQL statement is allowed.")

    first_word = masked.lstrip("( \n\t").split(None, 1)[0].upper() if masked.strip() else ""
    if first_word not in {"SELECT", "WITH"}:
        raise UnsafeQueryError("Only SELECT queries (optionally starting with WITH) are allowed.")

    match = _FORBIDDEN_RE.search(masked)
    if match:
        raise UnsafeQueryError(
            f"Keyword '{match.group(1).upper()}' is not allowed; the query must be read-only."
        )

    return cleaned
