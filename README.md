# Political Promise Verification API

Backend for **[kept.vote](https://github.com/cluster2600/kept.vote)** — a website
to track politician promises (EU / CH / NO).

A production-ready FastAPI backend that stores politicians, their promises,
uploaded documents, and implemented policies — then uses **Claude** to analyze
whether a given promise was fulfilled, returning a confidence score and detailed
reasoning.

## Features

- **REST API** for politicians, promises, documents, and policies.
- **Document processing** — upload PDF or Word files; text is extracted and stored.
- **AI verification** — Claude judges promise fulfilment and returns structured
  output (`status`, `confidence_score`, `reasoning`, `key_evidence`).
- **PostgreSQL** with async SQLAlchemy 2.0 and connection pooling.
- **UUID primary keys**, indexes for common queries, and cascade deletes.
- **Async/await** end-to-end (async DB driver + async Anthropic client).
- **Auto-created tables** on startup, **health checks**, and **statistics**.
- **Dockerized** with `docker-compose` (API + Postgres).

## Tech stack

FastAPI · SQLAlchemy 2.0 (async) · asyncpg · Pydantic v2 · Anthropic SDK ·
PyPDF2 · python-docx

> **Note on the Anthropic SDK version:** the original spec pinned
> `anthropic==0.15.1`. That release predates the `claude-opus-4-8` model and
> adaptive thinking, so `requirements.txt` uses a current SDK
> (`anthropic==0.69.0`). The model is configurable via `CLAUDE_MODEL`.

## Project layout

```
promise-verification-api/
├── main.py                # FastAPI app, routes, lifecycle
├── database.py            # SQLAlchemy models + async engine/session
├── schemas.py             # Pydantic request/response schemas
├── claude_service.py      # Claude API integration (verification)
├── document_processor.py  # PDF/Word text extraction
├── config.py              # Env-driven settings
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Configuration

All configuration is via environment variables (loaded from `.env` in
development). See [`.env.example`](./.env.example):

| Variable            | Description                                   | Default                |
| ------------------- | --------------------------------------------- | ---------------------- |
| `DATABASE_URL`      | PostgreSQL connection string                  | local docker-compose   |
| `ANTHROPIC_API_KEY` | Claude API key (required for `/api/verify`)   | _none_                 |
| `ENVIRONMENT`       | `development` or `production`                 | `development`          |
| `CLAUDE_MODEL`      | Claude model id                               | `claude-opus-4-8`      |
| `UPLOAD_DIR`        | Directory for stored uploads                  | `./uploads`            |

No credentials are hardcoded.

## Running with Docker (recommended)

```bash
cp .env.example .env          # then edit ANTHROPIC_API_KEY
docker compose up --build
```

The API is served at <http://localhost:8000>. Interactive docs (Swagger UI) are
at <http://localhost:8000/docs>.

## Running locally (without Docker)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # point DATABASE_URL at your Postgres, set the key
uvicorn main:app --reload
```

You need a reachable PostgreSQL instance. A plain `postgresql://...` URL is
automatically upgraded to the async `asyncpg` driver.

## API endpoints

| Method | Path                      | Description                              |
| ------ | ------------------------- | ---------------------------------------- |
| POST   | `/api/politicians`        | Create a politician                      |
| GET    | `/api/politicians/{id}`   | Get a politician                         |
| POST   | `/api/promises`           | Create a promise                         |
| GET    | `/api/promises/{id}`      | Get a promise                            |
| POST   | `/api/documents/upload`   | Upload a PDF/Word file, extract text     |
| POST   | `/api/policies`           | Create a policy                          |
| POST   | `/api/verify`             | Verify a promise with Claude             |
| GET    | `/health`                 | System + database health                 |
| GET    | `/api/status`             | Aggregate record counts                  |

## Example workflow

```bash
BASE=http://localhost:8000

# 1. Create a politician
POL=$(curl -s -X POST $BASE/api/politicians \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane Doe","country":"USA","party":"Independent"}')
POL_ID=$(echo "$POL" | python -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 2. Upload a document (PDF or .docx)
curl -s -X POST $BASE/api/documents/upload \
  -F "politician_id=$POL_ID" \
  -F "title=2020 Manifesto" \
  -F "document_type=manifesto" \
  -F "file=@manifesto.pdf"

# 3. Create a promise
PROM=$(curl -s -X POST $BASE/api/promises \
  -H 'Content-Type: application/json' \
  -d "{\"politician_id\":\"$POL_ID\",\"title\":\"Plant 1 million trees\",\"category\":\"environment\"}")
PROM_ID=$(echo "$PROM" | python -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 4. (Optional) Record an implemented policy
curl -s -X POST $BASE/api/policies \
  -H 'Content-Type: application/json' \
  -d "{\"politician_id\":\"$POL_ID\",\"title\":\"National Reforestation Act\",\"category\":\"environment\"}"

# 5. Verify the promise with Claude
curl -s -X POST $BASE/api/verify \
  -H 'Content-Type: application/json' \
  -d "{\"promise_id\":\"$PROM_ID\"}"
```

The verification response includes the `status`
(`fulfilled` / `in_progress` / `broken` / `no_action`), a `confidence_score`
between 0 and 1, the `reasoning`, the raw `claude_analysis`, and a
`human_review_status` for optional human oversight.

## Error handling

The API returns standard HTTP status codes with descriptive messages:

- `201` on resource creation, `200` on reads.
- `400` for invalid input or unsupported/empty uploads.
- `404` when a referenced politician/promise does not exist.
- `422` for schema validation failures (FastAPI/Pydantic).
- `500` if the Claude API key is missing; `502` if Claude returns an unparseable
  response.

## Extensibility

- **Migrations:** tables are auto-created on startup for convenience; add
  Alembic for versioned schema changes in production.
- **Human review:** `Verification.human_review_status` is ready for a review
  workflow; add `PATCH /api/verifications/{id}` to drive it.
- **Listing/filtering:** the schema's indexes (politician + category, dates)
  support adding paginated list endpoints cheaply.
```
