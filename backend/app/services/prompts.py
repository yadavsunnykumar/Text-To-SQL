"""Prompt templates and LLM-output parsing."""
import json
import re

from app.core.exceptions import LLMResponseError
from app.schemas.query import GeneratedSQL
from app.services.llm.base import ChatMessage

SQL_SYSTEM_PROMPT = """You are an expert data analyst who writes {dialect} SQL.
Translate the user's question into ONE read-only SQL query against the database below.

Rules:
- Use only the tables and columns listed in the schema. Never invent names.
- Only SELECT statements (CTEs with WITH are fine). Never modify data.
- Return a single statement without a trailing semicolon.
- Prefer explicit JOINs, readable column aliases and ORDER BY where it helps.
- Add LIMIT {max_rows} unless the question needs an aggregate over everything.
- If the question cannot be answered from this schema, set "sql" to null and say why in "explanation".

Respond with ONLY a JSON object, no markdown, in this exact shape:
{{"sql": "<the SQL query or null>", "explanation": "<one or two sentences on how the query answers the question>"}}

Database schema:
{schema}
"""

RETRY_PROMPT = """That query failed.

Query:
{sql}

Error:
{error}

Fix the query so it runs on {dialect} and still answers the original question.
Respond with ONLY the JSON object in the same shape as before."""

ANSWER_SYSTEM_PROMPT = """You are a helpful data analyst. Given a question, the SQL that was run and
its result rows, answer the question in plain English in at most three sentences.
Quote the key numbers. Do not mention SQL, tables or JSON. If the result is empty, say no matching data was found."""

ANSWER_USER_PROMPT = """Question: {question}

SQL used:
{sql}

Columns: {columns}
Rows (first {shown} of {total}{truncated}):
{rows}"""


def build_sql_messages(question: str, schema: str, dialect: str, max_rows: int) -> list[ChatMessage]:
    return [
        {
            "role": "system",
            "content": SQL_SYSTEM_PROMPT.format(dialect=dialect, schema=schema, max_rows=max_rows),
        },
        {"role": "user", "content": question},
    ]


def build_retry_message(sql: str | None, error: str, dialect: str) -> ChatMessage:
    return {
        "role": "user",
        "content": RETRY_PROMPT.format(sql=sql or "(no SQL produced)", error=error, dialect=dialect),
    }


def build_answer_messages(
    question: str, sql: str, columns: list[str], rows: list[list], truncated: bool, limit: int = 50
) -> list[ChatMessage]:
    shown = rows[:limit]
    return [
        {"role": "system", "content": ANSWER_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": ANSWER_USER_PROMPT.format(
                question=question,
                sql=sql,
                columns=", ".join(columns),
                shown=len(shown),
                total=len(rows),
                truncated=", result truncated" if truncated else "",
                rows=json.dumps(shown, default=str),
            ),
        },
    ]


_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL | re.IGNORECASE)
_SQL_FENCE_RE = re.compile(r"```sql\s*(.*?)```", re.DOTALL | re.IGNORECASE)
_BARE_SQL_RE = re.compile(r"^\s*(SELECT|WITH)\b", re.IGNORECASE)


def _first_json_object(text: str) -> str | None:
    """Find the first balanced {...} block, respecting strings."""
    start = text.find("{")
    while start != -1:
        depth, in_str, escape = 0, False, False
        for i in range(start, len(text)):
            ch = text[i]
            if in_str:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return text[start : i + 1]
        start = text.find("{", start + 1)
    return None


def parse_sql_response(raw: str) -> GeneratedSQL:
    """Extract {"sql", "explanation"} from an LLM reply, tolerating common formatting slips."""
    if not raw or not raw.strip():
        raise LLMResponseError("The model returned an empty response.")

    candidates: list[str] = []
    fenced = _JSON_FENCE_RE.search(raw)
    if fenced:
        candidates.append(fenced.group(1))
    obj = _first_json_object(raw)
    if obj:
        candidates.append(obj)

    for candidate in candidates:
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and ("sql" in data or "query" in data):
            sql = data.get("sql", data.get("query"))
            if isinstance(sql, str):
                sql = sql.strip() or None
            return GeneratedSQL(sql=sql, explanation=data.get("explanation"))

    sql_block = _SQL_FENCE_RE.search(raw)
    if sql_block:
        return GeneratedSQL(sql=sql_block.group(1).strip(), explanation=None)
    if _BARE_SQL_RE.match(raw):
        return GeneratedSQL(sql=raw.strip(), explanation=None)

    raise LLMResponseError(
        'Could not find SQL in the response. Reply with JSON like {"sql": "...", "explanation": "..."}.'
    )
