from fastapi import APIRouter, Depends

from app.api.deps import get_text_to_sql_service
from app.schemas.common import ErrorResponse
from app.schemas.query import QueryRequest, QueryResponse
from app.services.text_to_sql import TextToSQLService

router = APIRouter(prefix="/query", tags=["query"])


@router.post(
    "",
    response_model=QueryResponse,
    summary="Ask a question in plain English",
    description=(
        "The LLM writes the SQL, failing queries are sent back to it with the error for a retry, "
        "and the response contains the answer, the rows and the query that was used. "
        "`success=false` means no working query was produced; `attempts` shows why."
    ),
    responses={400: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
def ask(request: QueryRequest, service: TextToSQLService = Depends(get_text_to_sql_service)) -> QueryResponse:
    # Sync endpoint: FastAPI runs it in a worker thread, so blocking LLM / DB calls are fine.
    return service.ask(request)
