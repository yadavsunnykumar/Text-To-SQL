from fastapi import APIRouter, Depends

from app.api.deps import get_app_settings, get_database, get_llm_factory
from app.core.config import Settings
from app.schemas.common import HealthResponse, ProvidersResponse
from app.services.database import DatabaseService
from app.services.llm.factory import LLMProviderFactory

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health(
    settings: Settings = Depends(get_app_settings),
    database: DatabaseService = Depends(get_database),
) -> HealthResponse:
    db_ok = database.ping()
    return HealthResponse(
        status="ok" if db_ok else "degraded",
        app=settings.app_name,
        database=f"{database.dialect}:{'up' if db_ok else 'down'}",
        default_provider=settings.llm_provider,
    )


@router.get("/providers", response_model=ProvidersResponse)
def providers(factory: LLMProviderFactory = Depends(get_llm_factory)) -> ProvidersResponse:
    return ProvidersResponse(default=factory.default_provider, providers=factory.list_providers())
