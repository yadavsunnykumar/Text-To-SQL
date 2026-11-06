from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app: str
    database: str
    default_provider: str


class ProviderInfo(BaseModel):
    name: str
    model: str
    configured: bool
    is_default: bool


class ProvidersResponse(BaseModel):
    default: str
    providers: list[ProviderInfo]


class ErrorResponse(BaseModel):
    detail: str
