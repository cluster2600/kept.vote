# Political Promise Verification API

Backend for **[kept.vote](https://github.com/cluster2600/kept.vote)** — a website
to track politician promises (EU / CH / NO).

> **Production** runs on Cloudflare: a Worker (the Next.js site, built with
> vinext) reading a D1 database, on <https://kept.vote>. The site's data is the
> read API below, rendered ahead of time from `data/*.json` by `build_d1.py`.
> See [`DEPLOY.md`](./DEPLOY.md).

A production-ready FastAPI backend that stores politicians, their promises,
uploaded documents, and implemented policies — then uses **Claude** to analyze
whether a given promise was fulfilled, returning a confidence score and detailed
reasoning.

## Features

- **REST API** for politicians, promises, documents, and policies.
- **Document processing** — upload PDF or Word files; text is extracted and stored.
- **AI verification** — Claude judges promise fulfilment and returns structured
  output (`status`, `confidence_score`, `reasoning`, `key_evidence`).
- **PostgreSQL** with async SQLAlchemy 2.1 and connection pooling.
- **UUID primary keys**, indexes for common queries, and cascade deletes.
- **Async/await** end-to-end (async DB driver + async Anthropic client).
- **Auto-created tables** on startup, **health checks**, and **statistics**.
- **Dockerized** with `docker-compose` (API + Postgres).

## Tech stack

FastAPI · SQLAlchemy 2.1 (async) · asyncpg · Pydantic v2 · Anthropic SDK 1.x ·
pypdf · python-docx — Python 3.10+ (the Docker image uses 3.14).

> **Note on the Anthropic SDK version:** `requirements.txt` pins a current 1.x
> SDK (`anthropic==1.15.0`), which requires Python ≥ 3.10. The model is
> configurable via `CLAUDE_MODEL` and thinking depth via `CLAUDE_VERIFY_EFFORT`.

## Project layout

```
promise-verification-api/
├── main.py                # FastAPI app, routes, lifecycle
├── database.py            # SQLAlchemy models + async engine/session
├── schemas.py             # Pydantic request/response schemas
├── claude_service.py      # Claude API integration (verification)
├── document_processor.py  # PDF/Word text extraction
├── config.py              # Env-driven settings
├── seed.py                # Reproducible demo data (Emmanuel Macron)
├── data/                  # Politician profiles (JSON), one file per section
├── import_promises.py     # Load a profile's promises + verdicts into the DB
├── import_profile.py      # Load a profile's other sections into the DB
├── validate_profile.py    # Check profiles against docs/PROFILE_FORMAT.md
├── build_d1.py            # Render the site's data into SQL for Cloudflare D1
├── d1/                    # D1 schema (+ generated seed in d1/build/)
├── harvest.py             # Source checks and research pages (Kitesurf)
├── harvest/               # kept-vote-kitesurf Worker (docs/HARVEST.md)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml     # Postgres + API (local tooling)
├── .env.example
├── frontend/              # Next.js + Tailwind public website (kept.vote)
│   ├── app/               # App Router pages (home, politician, promise)
│   ├── components/        # StatusBadge, ConfidenceMeter, TrackRecord, …
│   ├── lib/api.ts         # Typed backend client
│   └── ...
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
| `CLAUDE_MODEL`      | Claude model id                               | `claude-opus-5-5`      |
| `CLAUDE_MAX_TOKENS` | Output cap (thinking + JSON verdict)          | `16000`                |
| `CLAUDE_VERIFY_EFFORT` | `low` / `medium` / `high` / `xhigh` / `max` | `medium`            |
| `UPLOAD_DIR`        | Directory for stored uploads                  | `./uploads`            |

No credentials are hardcoded.

## Run the website locally

The site reads its data from a local D1 database seeded from `data/`:

```bash
pip install -r requirements.txt   # API deps + aiosqlite, used by build_d1.py
python build_d1.py                # renders data/*.json → d1/build/seed.sql

cd frontend
npm install
npm run db:local                  # loads the seed into the local D1
npm run dev                       # http://localhost:3001
```

## Run the API locally

The FastAPI app is the data and tooling layer: importers, document upload, AI
verification. `build_d1.py` runs it in-process; to run it as a server with
Postgres:

```bash
cp .env.example .env          # optional: set ANTHROPIC_API_KEY for AI /api/verify
docker compose up --build     # starts db + api (:8000)
docker compose exec api python seed.py
```

API docs: <http://localhost:8000/docs> (Swagger UI).

> The seed loads Emmanuel Macron with six real, sourced promises (4 kept,
> 1 broken, 1 in progress). It's idempotent — re-running is a no-op; use
> `docker compose exec api python seed.py --reset` to wipe and reload.

### API only, without Docker

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # point DATABASE_URL at your Postgres, set the key
uvicorn main:app --reload
python seed.py                # loads the demo data over HTTP
```

A plain `postgresql://...` URL is automatically upgraded to the async `asyncpg`
driver.

## Front-end (kept.vote website)

A Next.js (App Router) + Tailwind app in [`frontend/`](./frontend), built with
[vinext](https://github.com/cloudflare/vinext) and deployed as a Cloudflare
Worker. It's the public, trustworthy face of the data:

- **Home** — hero, live stats, and a politician list with a colour-coded track
  record (kept / in progress / broken).
- **Politician** — bio, an overall track-record bar, and every promise with its
  status badge and confidence.
- **Promise** — the fact-check view: verdict, confidence meter, written
  assessment, bulleted key evidence, and a link to the primary source.

Pages are server-rendered (React Server Components) in 26 languages and read
their data from D1 through [`frontend/lib/data.ts`](./frontend/lib/data.ts), which
returns the same JSON the read API serves.

## Politician profiles

Profiles live in [`data/`](./data) as one JSON file per section. To add a
politician, follow [`docs/PROFILE_FORMAT.md`](./docs/PROFILE_FORMAT.md): it
covers the fields, sourcing and editorial rules, and the
`python validate_profile.py --strict <slug>` check every new profile must pass.
Sources are read and re-checked through Cloudflare Kitesurf with
[`harvest.py`](./harvest.py); see [`docs/HARVEST.md`](./docs/HARVEST.md).

## API endpoints

| Method | Path                                | Description                                      |
| ------ | ----------------------------------- | ------------------------------------------------ |
| GET    | `/api/politicians`                  | List politicians with promise/verdict counts (`?country=FR` filters by ISO code) |
| POST   | `/api/politicians`                  | Create a politician                              |
| GET    | `/api/politicians/{id}`             | Get a politician                                 |
| DELETE | `/api/politicians/{id}`             | Delete a politician (cascades)                   |
| GET    | `/api/politicians/{id}/promises`    | List a politician's promises + latest verdicts   |
| POST   | `/api/promises`                     | Create a promise                                 |
| GET    | `/api/promises/{id}`                | Get a promise                                    |
| GET    | `/api/promises/{id}/verification`   | Get a promise's latest verification              |
| POST   | `/api/documents/upload`             | Upload a PDF/Word file, extract text             |
| POST   | `/api/policies`                     | Create a policy                                  |
| POST   | `/api/verifications`                | Record a curated (human) verification            |
| POST   | `/api/verify`                       | Verify a promise with Claude (AI)                |
| GET    | `/health`                           | System + database health                         |
| GET    | `/api/status`                       | Aggregate record counts                          |

The front-end relies on `GET /api/politicians`,
`GET /api/politicians/{id}/promises`, `GET /api/promises/{id}`, and
`GET /api/promises/{id}/verification`.

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
