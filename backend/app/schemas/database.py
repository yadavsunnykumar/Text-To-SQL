from pydantic import BaseModel, Field


class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool = True
    primary_key: bool = False


class ForeignKeyInfo(BaseModel):
    columns: list[str]
    referred_table: str
    referred_columns: list[str]


class TableInfo(BaseModel):
    name: str
    columns: list[ColumnInfo] = Field(default_factory=list)
    foreign_keys: list[ForeignKeyInfo] = Field(default_factory=list)
    row_count: int | None = None


class SchemaResponse(BaseModel):
    dialect: str
    tables: list[TableInfo]
