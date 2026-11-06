import pytest

from app.core.exceptions import QueryExecutionError


def test_schema_lists_sample_tables(database):
    schema = database.get_schema()
    names = {t.name for t in schema.tables}
    assert {"customers", "orders", "order_items", "products", "categories"} <= names
    orders = next(t for t in schema.tables if t.name == "orders")
    assert any(c.primary_key and c.name == "id" for c in orders.columns)
    assert any(fk.referred_table == "customers" for fk in orders.foreign_keys)
    assert orders.row_count == 600


def test_schema_prompt_mentions_tables_and_samples(database):
    text = database.schema_for_prompt()
    assert "TABLE customers" in text
    assert "REFERENCES customers(id)" in text
    assert "sample rows" in text


def test_execute_returns_columns_and_rows(database):
    result = database.execute("SELECT id, name FROM categories ORDER BY id")
    assert result.columns == ["id", "name"]
    assert result.rows[0] == [1, "Electronics"]
    assert result.truncated is False


def test_execute_truncates_to_max_rows(database):
    result = database.execute("SELECT * FROM orders")
    assert result.row_count == database.max_rows
    assert result.truncated is True


def test_execute_wraps_database_errors(database):
    with pytest.raises(QueryExecutionError) as exc:
        database.execute("SELECT * FROM missing_table")
    assert "missing_table" in exc.value.message


def test_connection_is_read_only(database):
    with pytest.raises(QueryExecutionError):
        database.execute("DELETE FROM orders")
    assert database.execute("SELECT COUNT(*) FROM orders").rows[0][0] == 600
