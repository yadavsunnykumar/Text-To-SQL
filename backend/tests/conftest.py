"""Shared fixtures: a temporary sample database and a scripted fake LLM (no API keys needed)."""
from collections.abc import Iterable

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.exceptions import ProviderNotConfiguredError
from app.db.seed import build as build_sample_db
from app.main import create_app
from app.schemas.common import ProviderInfo
from app.services.database import DatabaseService
from app.services.llm.base import ChatMessage, LLMProvider
from app.services.text_to_sql import TextToSQLService


class FakeLLM(LLMProvider):
    """Returns pre-scripted replies in order and records every prompt it receives."""

    def __init__(self, replies: Iterable[str], name: str = "groq", model: str = "fake-model"):
        self.replies = list(replies)
        self.name = name
        self.model = model
        self.calls: list[list[ChatMessage]] = []

    def complete(self, messages: list[ChatMessage]) -> str:
        self.calls.append(list(messages))
        if not self.replies:
            return "No more scripted replies."
        return self.replies.pop(0)


class FakeFactory:
    def __init__(self, llm: FakeLLM | None):
        self.llm = llm
        self.default_provider = "groq"

    def get(self, name=None):
        if self.llm is None:
            raise ProviderNotConfiguredError("No API key configured for 'groq'.")
        return self.llm

    def list_providers(self):
        return [
            ProviderInfo(name="openai", model="gpt-test", configured=False, is_default=False),
            ProviderInfo(name="groq", model="fake-model", configured=self.llm is not None, is_default=True),
        ]


@pytest.fixture(scope="session")
def sample_db_path(tmp_path_factory):
    return build_sample_db(tmp_path_factory.mktemp("db") / "sample.db")


@pytest.fixture
def database(sample_db_path):
    db = DatabaseService(f"sqlite:///{sample_db_path}", max_rows=100, sample_rows_in_prompt=2)
    yield db
    db.dispose()


@pytest.fixture
def make_service(database):
    def _make(replies: Iterable[str], max_retries: int = 2, generate_answer: bool = False):
        llm = FakeLLM(replies)
        service = TextToSQLService(database, FakeFactory(llm), max_retries=max_retries, generate_answer=generate_answer)
        return service, llm

    return _make


@pytest.fixture
def make_client(sample_db_path):
    clients = []

    def _make(replies: Iterable[str] | None = None, configured: bool = True):
        settings = Settings(database_url=f"sqlite:///{sample_db_path}", generate_answer=True, max_retries=2)
        app = create_app(settings)
        db = DatabaseService(settings.resolved_database_url, max_rows=100)
        llm = FakeLLM(replies or []) if configured else None
        factory = FakeFactory(llm)
        app.state.database = db
        app.state.llm_factory = factory
        app.state.text_to_sql = TextToSQLService(db, factory, max_retries=2, generate_answer=True)
        client = TestClient(app)
        client.__enter__()
        clients.append(client)
        return client, llm

    yield _make
    for c in clients:
        c.__exit__(None, None, None)
