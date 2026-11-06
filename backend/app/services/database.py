"""Database access: schema introspection and safe, read-only query execution."""
import base64
import datetime as dt
import decimal
import logging
import uuid
from typing import Any

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import QueryExecutionError
from app.schemas.database import ColumnInfo, ForeignKeyInfo, SchemaResponse, TableInfo
from app.schemas.query import QueryResult

logger = logging.getLogger(__name__)


def _to_json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, (dt.datetime, dt.date, dt.time)):
        return value.isoformat()
    if isinstance(value, dt.timedelta):
        return value.total_seconds()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (bytes, bytearray, memoryview)):
        return base64.b64encode(bytes(value)).decode("ascii")
    return str(value)


class DatabaseService:
    def __init__(self, database_url: str, max_rows: int = 500, sample_rows_in_prompt: int = 3):
        self.database_url = database_url
        self.max_rows = max_rows
        self.sample_rows_in_prompt = sample_rows_in_prompt
        self.engine: Engine = self._create_engine(database_url)
        self._schema_cache: SchemaResponse | None = None
        self._prompt_cache: str | None = None

    # ------------------------------------------------------------------ setup
    @staticmethod
    def _create_engine(url: str) -> Engine:
        is_sqlite = url.startswith("sqlite")
        connect_args = {"check_same_thread": False} if is_sqlite else {}
        engine = create_engine(url, pool_pre_ping=True, connect_args=connect_args)

        if is_sqlite:
            @event.listens_for(engine, "connect")
            def _sqlite_read_only(dbapi_conn, _record):  # pragma: no cover - driver hook
                cursor = dbapi_conn.cursor()
                cursor.execute("PRAGMA query_only = ON")
                cursor.close()

        return engine

    @property
    def dialect(self) -> str:
        return self.engine.dialect.name

    def ping(self) -> bool:
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError:
            logger.exception("Database ping failed")
            return False

    def dispose(self) -> None:
        self.engine.dispose()

    # ----------------------------------------------------------------- schema
    def get_schema(self, refresh: bool = False) -> SchemaResponse:
        if self._schema_cache is not None and not refresh:
            return self._schema_cache

        inspector = inspect(self.engine)
        tables: list[TableInfo] = []
        for table_name in sorted(inspector.get_table_names()):
            pk_cols = set(inspector.get_pk_constraint(table_name).get("constrained_columns") or [])
            columns = [
                ColumnInfo(
                    name=col["name"],
                    type=str(col["type"]),
                    nullable=bool(col.get("nullable", True)),
                    primary_key=col["name"] in pk_cols,
                )
                for col in inspector.get_columns(table_name)
            ]
            fks = [
                ForeignKeyInfo(
                    columns=fk.get("constrained_columns") or [],
                    referred_table=fk.get("referred_table") or "",
                    referred_columns=fk.get("referred_columns") or [],
                )
                for fk in inspector.get_foreign_keys(table_name)
            ]
            tables.append(
                TableInfo(name=table_name, columns=columns, foreign_keys=fks, row_count=self._count(table_name))
            )

        self._schema_cache = SchemaResponse(dialect=self.dialect, tables=tables)
        self._prompt_cache = None
        return self._schema_cache

    def _quote(self, identifier: str) -> str:
        return self.engine.dialect.identifier_preparer.quote(identifier)

    def _count(self, table_name: str) -> int | None:
        try:
            with self.engine.connect() as conn:
                return int(conn.execute(text(f"SELECT COUNT(*) FROM {self._quote(table_name)}")).scalar() or 0)
        except SQLAlchemyError:
            return None

    def _sample_rows(self, table_name: str) -> QueryResult | None:
        if self.sample_rows_in_prompt <= 0:
            return None
        try:
            return self._run(
                f"SELECT * FROM {self._quote(table_name)}", limit=self.sample_rows_in_prompt
            )
        except QueryExecutionError:
            return None

    def schema_for_prompt(self) -> str:
        """Compact textual description of the schema for the LLM prompt."""
        if self._prompt_cache is not None:
            return self._prompt_cache

        schema = self.get_schema()
        blocks: list[str] = []
        for table in schema.tables:
            cols = ", ".join(
                f"{c.name} {c.type}{' PRIMARY KEY' if c.primary_key else ''}{'' if c.nullable else ' NOT NULL'}"
                for c in table.columns
            )
            lines = [f"TABLE {table.name} ({cols})"]
            for fk in table.foreign_keys:
                lines.append(
                    f"  FOREIGN KEY ({', '.join(fk.columns)}) REFERENCES "
                    f"{fk.referred_table}({', '.join(fk.referred_columns)})"
                )
            sample = self._sample_rows(table.name)
            if sample and sample.rows:
                lines.append(f"  -- sample rows ({', '.join(sample.columns)}):")
                lines.extend(f"  -- {row}" for row in sample.rows)
            blocks.append("\n".join(lines))

        self._prompt_cache = "\n\n".join(blocks)
        return self._prompt_cache

    # -------------------------------------------------------------- execution
    def execute(self, sql: str) -> QueryResult:
        return self._run(sql, limit=self.max_rows)

    def _run(self, sql: str, limit: int) -> QueryResult:
        try:
            with self.engine.connect() as conn:
                try:
                    result = conn.execute(text(sql))
                    if not result.returns_rows:
                        raise QueryExecutionError("The statement did not return any rows.")
                    columns = list(result.keys())
                    fetched = result.fetchmany(limit + 1)
                finally:
                    # Never commit anything - belt and braces on top of the validator.
                    conn.rollback()
        except SQLAlchemyError as exc:
            message = str(getattr(exc, "orig", None) or exc).strip().splitlines()[0]
            raise QueryExecutionError(message) from exc

        truncated = len(fetched) > limit
        rows = [[_to_json_safe(v) for v in row] for row in fetched[:limit]]
        return QueryResult(columns=columns, rows=rows, row_count=len(rows), truncated=truncated)
