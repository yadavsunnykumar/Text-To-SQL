from fastapi import APIRouter, Depends, Query

from app.api.deps import get_database
from app.schemas.database import SchemaResponse
from app.services.database import DatabaseService

router = APIRouter(prefix="/schema", tags=["schema"])


@router.get("", response_model=SchemaResponse)
def get_schema(
    refresh: bool = Query(False, description="Re-read the schema from the database"),
    database: DatabaseService = Depends(get_database),
) -> SchemaResponse:
    return database.get_schema(refresh=refresh)
