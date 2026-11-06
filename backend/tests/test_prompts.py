import pytest

from app.core.exceptions import LLMResponseError
from app.services.prompts import build_retry_message, build_sql_messages, parse_sql_response


def test_parses_plain_json():
    out = parse_sql_response('{"sql": "SELECT 1", "explanation": "one"}')
    assert out.sql == "SELECT 1"
    assert out.explanation == "one"


def test_parses_json_inside_markdown_fence():
    out = parse_sql_response('Sure!\n```json\n{"sql": "SELECT {x}", "explanation": "braces in strings"}\n```')
    assert out.sql == "SELECT {x}"


def test_parses_json_with_surrounding_text():
    out = parse_sql_response('Here you go: {"sql": "SELECT 2", "explanation": null} hope it helps')
    assert out.sql == "SELECT 2"


def test_accepts_query_key_alias():
    assert parse_sql_response('{"query": "SELECT 3"}').sql == "SELECT 3"


def test_null_sql_means_unanswerable():
    out = parse_sql_response('{"sql": null, "explanation": "No salary data."}')
    assert out.sql is None
    assert out.explanation == "No salary data."


def test_falls_back_to_sql_fence_and_bare_sql():
    assert parse_sql_response("```sql\nSELECT 4\n```").sql == "SELECT 4"
    assert parse_sql_response("SELECT 5 FROM t").sql == "SELECT 5 FROM t"


@pytest.mark.parametrize("raw", ["", "I don't know", "{not json}"])
def test_raises_on_unusable_output(raw):
    with pytest.raises(LLMResponseError):
        parse_sql_response(raw)


def test_sql_messages_include_schema_and_dialect():
    messages = build_sql_messages("How many orders?", "TABLE orders (id INTEGER)", "sqlite", 100)
    assert messages[0]["role"] == "system"
    assert "TABLE orders" in messages[0]["content"]
    assert "sqlite" in messages[0]["content"]
    assert messages[1] == {"role": "user", "content": "How many orders?"}


def test_retry_message_contains_error_and_sql():
    msg = build_retry_message("SELECT nope", "no such column: nope", "sqlite")
    assert "no such column: nope" in msg["content"]
    assert "SELECT nope" in msg["content"]
