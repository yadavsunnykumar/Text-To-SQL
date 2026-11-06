# Text-to-SQL Analyst

Ask a question in plain English and get back an answer, the result rows and the exact SQL that produced them.

- **The LLM writes the query** (OpenAI or Groq, switchable per question)
- **Failing queries go back for a retry**: the database error is sent back to the model, which repairs the SQL (configurable retry limit)
- **The response includes the answer and the query used**: a plain-English answer, a sortable/filterable table, CSV export, the SQL, and a timeline of every attempt

```
text-to-sql/
├── backend/    FastAPI · Pydantic v2 · SQLAlchemy · OpenAI / Groq SDKs · pytest
└── frontend/   Angular 20 · Angular Material (M3) · Bootstrap 5 · Jasmine/Karma
```

---

## 1. Backend (FastAPI)

Requirements: Python 3.10+

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env                 # then paste GROQ_API_KEY and/or OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- On first start a sample **e-commerce SQLite database** is created at `backend/data/sample.db`
  (customers, products, categories, orders, order_items: about 600 orders across 2024–2026).
  Rebuild it with `python -m app.db.seed --force`.
- To use your own database, set `DATABASE_URL` in `.env` (PostgreSQL and MySQL work through SQLAlchemy; install the driver noted in `requirements.txt`).

### API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/query` | `{ "question": "...", "provider": "groq" \| "openai", "max_retries": 3 }` → answer, SQL, rows, attempts |
| `GET` | `/api/schema?refresh=false` | Tables, columns, PK/FK, row counts |
| `GET` | `/api/providers` | Which LLM providers have API keys and which models they use |
| `GET` | `/api/health` | API + database status |

Example response (trimmed):

```json
{
  "success": true,
  "question": "Top 3 customers by total spend",
  "sql": "SELECT c.first_name, c.last_name, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_spent FROM customers c JOIN orders o ON ... LIMIT 3",
  "answer": "Priya Sharma spent the most at ₹2,41,560, followed by ...",
  "columns": ["first_name", "last_name", "total_spent"],
  "rows": [["Priya", "Sharma", 241560.0], ["..."]],
  "attempts": [
    { "attempt": 1, "sql": "SELECT ... o.total ...", "error": "no such column: o.total", "success": false },
    { "attempt": 2, "sql": "SELECT ...", "error": null, "success": true }
  ],
  "provider": "groq",
  "model": "openai/gpt-oss-120b"
}
```

### How a question is handled

```
question ─► prompt (schema + sample rows + dialect) ─► LLM ─► parse JSON {sql, explanation}
                                                         ▲            │
                                                         │       validate (read-only, single SELECT/WITH)
                                         error message ──┤            │
                                                         │       execute (rows capped at MAX_ROWS)
                                                         └── fails ◄──┤
                                                                      ▼ ok
                                                     LLM summarises the rows ─► answer + rows + SQL + attempts
```

### Safety

The model's SQL is never trusted:

1. `sql_validator.py` rejects anything that isn't a single `SELECT`/`WITH` statement, and any write/DDL keyword (`INSERT`, `DROP`, `ATTACH`, `PRAGMA`, `INTO`, …) found outside string literals.
2. SQLite connections run with `PRAGMA query_only = ON`; every connection is rolled back, never committed.
3. For production databases, also connect with a **read-only database user**.

### Configuration (`backend/.env`)

| Variable | Default | |
|---|---|---|
| `LLM_PROVIDER` | `groq` | Default provider when the client doesn't choose one |
| `GROQ_API_KEY` / `GROQ_MODEL` | – / `openai/gpt-oss-120b` | |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | – / `gpt-4o-mini` | |
| `DATABASE_URL` | bundled SQLite | Any SQLAlchemy URL |
| `MAX_RETRIES` | `3` | Repair attempts after the first try |
| `MAX_ROWS` | `500` | Rows returned to the client |
| `SAMPLE_ROWS_IN_PROMPT` | `3` | Example rows per table shown to the model |
| `GENERATE_ANSWER` | `true` | Second LLM call that writes the plain-English answer |
| `CORS_ORIGINS` | `["http://localhost:4200"]` | |

### Tests

```bash
cd backend
pytest
```

The tests use a scripted fake LLM, so no API key or network is needed. They cover the validator, LLM-output parsing, schema introspection, the retry loop and the HTTP endpoints.

### Backend layout

```
backend/app/
├── main.py                 app factory, CORS, error handlers, lifespan (creates services)
├── core/                   config (pydantic-settings), exceptions, logging
├── schemas/                Pydantic request/response models
├── api/
│   ├── deps.py             dependency providers
│   └── routes/             health.py · schema.py · query.py
├── services/
│   ├── text_to_sql.py      orchestration + retry loop
│   ├── prompts.py          prompt templates + robust JSON/SQL parsing
│   ├── sql_validator.py    read-only guard
│   ├── database.py         SQLAlchemy engine, schema introspection, execution
│   └── llm/                base interface · OpenAI & Groq providers · factory
└── db/seed.py              sample database generator
```

---

## 2. Frontend (Angular)

Requirements: Node 20.19+ or 22.12+, npm

```bash
cd frontend
npm install
npm start                 # http://localhost:4200 (talks to http://localhost:8000/api)
```

| Command | |
|---|---|
| `npm start` | Dev server |
| `npm run build` | Production build to `dist/` (API expected at same-origin `/api`) |
| `npm test` | Unit tests in watch mode (Karma + Jasmine, opens Chrome) |
| `npm run test:ci` | Single headless run with coverage report in `coverage/` |

### Screens

- **Ask**: question box, provider picker (providers without a key are disabled), retry limit, example chips, Ctrl/⌘+Enter to run. Results show the answer card, highlighted SQL with a copy button, a paginated, sortable and filterable results table with CSV export, and the attempts timeline showing each error sent back to the model.
- **Schema**: every table with columns, types, PK/FK badges and row counts; search; "ask about this table".
- **History**: last 50 questions (stored in the browser's localStorage); re-run or delete.
- **Header**: live API health indicator (click to re-check).

### Frontend layout

```
frontend/src/app/
├── core/                        app-wide, singleton
│   ├── models/                  API contracts (query, schema, system, history)
│   ├── services/                query-api · schema (cached) · system · query-history · notification · csv-export
│   ├── interceptors/            http-error.interceptor (FastAPI errors → friendly message + snackbar)
│   └── tokens/                  API_BASE_URL, SKIP_ERROR_TOAST
├── shared/                      reusable, no business logic
│   ├── components/              sql-viewer · empty-state
│   ├── pipes/                   duration · cell-value · sql-highlight
│   └── utils/                   csv.util
├── features/
│   ├── query/
│   │   ├── pages/query-page/
│   │   ├── components/          query-input · answer-card · results-table · attempts-timeline
│   │   ├── services/            query-state.service (signal store)
│   │   └── constants/           example questions
│   ├── schema/                  pages/schema-page · components/table-card
│   └── history/                 pages/history-page
├── layout/header/
├── app.component.ts · app.config.ts · app.routes.ts (lazy-loaded pages)
src/testing/mock-data.ts         shared test fixtures
```

Every service, component, pipe and the interceptor has a `*.spec.ts` next to it. HTTP is tested with `HttpTestingController`, and components are tested through their rendered DOM and signal inputs.

---

## Try these questions on the sample data

- Top 5 customers by total amount spent
- Monthly revenue for 2025
- Which product category sells the most units?
- How many orders were cancelled or returned per country?
- Average order value by city in India
- Products that have never been ordered
