import pytest

from app.core.exceptions import UnsafeQueryError
from app.services.sql_validator import clean_sql, validate_sql


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT * FROM customers",
        "select id from orders where status = 'delivered'",
        "WITH t AS (SELECT 1 AS x) SELECT x FROM t",
        "(SELECT 1) UNION (SELECT 2)",
        "SELECT REPLACE(name, 'a', 'b') FROM products",
        "SELECT * FROM orders WHERE status = 'dropped; delete everything'",
        'SELECT "update" FROM t',
    ],
)
def test_allows_read_only_queries(sql):
    assert validate_sql(sql)


@pytest.mark.parametrize(
    "sql, fragment",
    [
        ("DROP TABLE customers", "SELECT"),
        ("DELETE FROM orders", "SELECT"),
        ("SELECT 1; DROP TABLE customers", "single"),
        ("WITH x AS (DELETE FROM orders RETURNING *) SELECT * FROM x", "DELETE"),
        ("SELECT * INTO backup FROM customers", "INTO"),
        ("PRAGMA table_info(customers)", "SELECT"),
        ("", "empty"),
        ("   ;  ", "empty"),
        (None, "empty"),
    ],
)
def test_rejects_unsafe_queries(sql, fragment):
    with pytest.raises(UnsafeQueryError) as exc:
        validate_sql(sql)
    assert fragment.lower() in exc.value.message.lower()


def test_clean_sql_strips_fences_comments_and_semicolons():
    raw = "```sql\n-- top customers\nSELECT * FROM customers /* all */;\n```"
    assert clean_sql(raw) == "SELECT * FROM customers"


def test_validate_returns_cleaned_sql():
    assert validate_sql("SELECT 1;;") == "SELECT 1"
