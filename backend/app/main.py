"""FastAPI application factory.

Run:  uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import api_router
from app.core.config import DEFAULT_SQLITE_PATH, Settings, get_settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging
from app.db.seed import build as build_sample_db
from app.services.database import DatabaseService
from app.services.llm.factory import LLMProviderFactory
from app.services.text_to_sql import TextToSQLService

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if settings.uses_default_sqlite and not DEFAULT_SQLITE_PATH.exists():
            logger.info("Creating sample database at %s", DEFAULT_SQLITE_PATH)
            build_sample_db(DEFAULT_SQLITE_PATH)

        # Tests may pre-populate app.state with fakes; only build what is missing.
        state = app.state
        state.settings = settings
        if not hasattr(state, "database"):
            state.database = DatabaseService(
                settings.resolved_database_url,
                max_rows=settings.max_rows,
                sample_rows_in_prompt=settings.sample_rows_in_prompt,
            )
        if not hasattr(state, "llm_factory"):
            state.llm_factory = LLMProviderFactory(settings)
        if not hasattr(state, "text_to_sql"):
            state.text_to_sql = TextToSQLService(
                database=state.database,
                llm_factory=state.llm_factory,
                max_retries=settings.max_retries,
                generate_answer=settings.generate_answer,
            )
        logger.info("Connected to %s database; default LLM provider: %s", state.database.dialect, settings.llm_provider)
        yield
        state.database.dispose()

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="Ask questions in plain English; an LLM writes and repairs the SQL.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
