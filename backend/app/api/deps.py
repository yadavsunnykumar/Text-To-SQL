"""FastAPI dependencies. Services live on app.state and are created once in the lifespan hook."""
from fastapi import Request

from app.core.config import Settings
from app.services.database import DatabaseService
from app.services.llm.factory import LLMProviderFactory
from app.services.text_to_sql import TextToSQLService


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_database(request: Request) -> DatabaseService:
    return request.app.state.database


def get_llm_factory(request: Request) -> LLMProviderFactory:
    return request.app.state.llm_factory


def get_text_to_sql_service(request: Request) -> TextToSQLService:
    return request.app.state.text_to_sql
