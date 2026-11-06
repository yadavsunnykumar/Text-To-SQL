from fastapi import APIRouter

from app.api.routes import health, query, schema

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(schema.router)
api_router.include_router(query.router)
