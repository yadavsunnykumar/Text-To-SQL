import json

import pytest

from app.core.exceptions import ProviderNotConfiguredError
from app.schemas.query import QueryRequest
from app.services.text_to_sql import TextToSQLService
from tests.conftest import FakeFactory


def reply(sql, explanation="because"):
    return json.dumps({"sql": sql, "explanation": explanation})


def test_success_on_first_attempt(make_service):
    service, llm = make_service([reply("SELECT COUNT(*) AS total FROM orders")])
    res = service.ask(QueryRequest(question="How many orders?"))
    assert res.success is True
    assert res.sql == "SELECT COUNT(*) AS total FROM orders"
    assert res.columns == ["total"]
    assert res.rows == [[600]]
    assert len(res.attempts) == 1 and res.attempts[0].success
    assert len(llm.calls) == 1


def test_errors_are_sent_back_for_retry(make_service):
    service, llm = make_service(
        [reply("SELECT nme FROM customers"), reply("SELECT first_name FROM customers LIMIT 3")]
    )
    res = service.ask(QueryRequest(question="Show some customer names"))
    assert res.success is True
    assert [a.success for a in res.attempts] == [False, True]
    assert "nme" in res.attempts[0].error
    retry_prompt = llm.calls[1][-1]["content"]
    assert "nme" in retry_prompt and "failed" in retry_prompt


def test_unsafe_sql_is_rejected_and_retried(make_service):
    service, _ = make_service([reply("DROP TABLE orders"), reply("SELECT 1 AS ok")])
    res = service.ask(QueryRequest(question="Delete orders"))
    assert res.success is True
    assert "SELECT" in res.attempts[0].error


def test_gives_up_after_max_retries(make_service):
    service, llm = make_service([reply("SELECT * FROM nope")] * 5, max_retries=2)
    res = service.ask(QueryRequest(question="Something impossible"))
    assert res.success is False
    assert len(res.attempts) == 3
    assert "after 3 attempt" in res.error
    assert len(llm.calls) == 3


def test_request_can_override_retry_count(make_service):
    service, _ = make_service([reply("SELECT * FROM nope")] * 5, max_retries=3)
    res = service.ask(QueryRequest(question="Something impossible", max_retries=0))
    assert len(res.attempts) == 1


def test_unanswerable_question_stops_immediately(make_service):
    service, llm = make_service([reply(None, "There is no employee salary data.")])
    res = service.ask(QueryRequest(question="Average employee salary?"))
    assert res.success is False
    assert "salary" in res.error
    assert len(llm.calls) == 1


def test_generates_plain_english_answer(make_service):
    service, llm = make_service(
        [reply("SELECT COUNT(*) AS total FROM customers"), "There are 80 customers."], generate_answer=True
    )
    res = service.ask(QueryRequest(question="How many customers?"))
    assert res.answer == "There are 80 customers."
    assert "80" in llm.calls[1][-1]["content"]


def test_missing_provider_raises(database):
    service = TextToSQLService(database, FakeFactory(None))
    with pytest.raises(ProviderNotConfiguredError):
        service.ask(QueryRequest(question="How many orders?"))
