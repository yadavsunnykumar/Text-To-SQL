import json


def test_health(make_client):
    client, _ = make_client()
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["database"].startswith("sqlite")


def test_providers(make_client):
    client, _ = make_client()
    body = client.get("/api/providers").json()
    assert body["default"] == "groq"
    assert {p["name"] for p in body["providers"]} == {"openai", "groq"}


def test_schema(make_client):
    client, _ = make_client()
    body = client.get("/api/schema").json()
    assert body["dialect"] == "sqlite"
    assert "orders" in [t["name"] for t in body["tables"]]


def test_query_success(make_client):
    client, _ = make_client(
        [json.dumps({"sql": "SELECT COUNT(*) AS n FROM products", "explanation": "count"}), "There are 37 products."]
    )
    res = client.post("/api/query", json={"question": "How many products are there?"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["sql"] == "SELECT COUNT(*) AS n FROM products"
    assert body["answer"] == "There are 37 products."
    assert body["rows"] == [[37]]


def test_query_validation_error(make_client):
    client, _ = make_client()
    res = client.post("/api/query", json={"question": "  "})
    assert res.status_code == 422


def test_query_without_api_key_returns_400(make_client):
    client, _ = make_client(configured=False)
    res = client.post("/api/query", json={"question": "How many orders?"})
    assert res.status_code == 400
    assert "API key" in res.json()["detail"]
