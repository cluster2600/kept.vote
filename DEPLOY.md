# Deploying kept.vote

Production setup: **Neon** (Postgres) + **Render** (FastAPI API) + **Vercel**
(Next.js frontend). Roughly: create the DB → deploy the API pointed at it →
seed the data → deploy the frontend pointed at the API.

```
Browser ──> Vercel (Next.js, SSR) ──> Render (FastAPI) ──> Neon (Postgres)
```

> Note: the frontend renders on the server (React Server Components), so the
> **browser only talks to Vercel**; Vercel's server calls the Render API. That
> means CORS is not strictly exercised by the browser today, but we still set
> `CORS_ORIGINS` on the API so any future client-side calls (or direct API use)
> from the Vercel domain are allowed.

---

## 1. Neon — create the database

1. Create a project at <https://neon.tech> → it provisions a Postgres database.
2. Copy the **connection string** (Dashboard → Connect). It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxx-123.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Keep it for the next step. The app handles Neon's URL as-is: it rewrites the
   scheme to the async driver and strips `sslmode` / `channel_binding` (asyncpg
   can't parse those), enabling TLS via `connect_args` instead. No edits needed.
   - You can use either the pooled or direct Neon host; the pooled host is fine
     for a web service.

---

## 2. Render — deploy the API (Blueprint)

1. Push this repo to GitHub (already at `cluster2600/kept.vote`).
2. Render → **New + → Blueprint** → select the repo. Render reads
   [`render.yaml`](./render.yaml) and proposes the `kept-vote-api` web service
   (Docker, built from the repo `Dockerfile`, health check `/health`).
3. When prompted, set the env vars declared `sync: false`:
   - `DATABASE_URL` = the Neon connection string from step 1.
   - `CORS_ORIGINS` = your Vercel URL (you can fill this after step 4, e.g.
     `https://kept-vote.vercel.app`; re-deploy or edit later — see step 5).
   - `ANTHROPIC_API_KEY` = optional (only for the live AI `/api/verify`; the
     seeded site works without it).
   - `ENVIRONMENT=production` is already set in `render.yaml`.
4. Create the service. On boot the app auto-creates the tables (and runs the
   idempotent `external_id` migration). Confirm it's healthy:
   `https://<your-api>.onrender.com/health` → `{"status":"ok","database":"ok",...}`.

   Note the API URL (e.g. `https://kept-vote-api.onrender.com`).

---

## 3. Seed the data (once) — Macron + Zemmour

The datasets live in `data/` (committed). Run the two importers per politician
against the Neon DB. Each is idempotent (safe to re-run).

**Option A — Render Shell** (Service → **Shell** tab; `DATABASE_URL` is already
in the environment there):

```bash
# Macron (defaults)
python import_promises.py
python import_profile.py

# Zemmour (parameterised by env)
DATA_PREFIX=zemmour POLITICIAN_SLUG=eric-zemmour BIO_JSON=data/zemmour_bio.json python import_promises.py
DATA_PREFIX=zemmour POLITICIAN_SLUG=eric-zemmour BIO_JSON=data/zemmour_bio.json python import_profile.py
```

**Option B — run locally against Neon** (works on any Render plan; needs Python
deps or Docker locally). From the repo root, with the Neon URL exported:

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@ep-xxx.aws.neon.tech/neondb?sslmode=require'
export ENVIRONMENT=production
pip install -r requirements.txt           # or use a venv
python import_promises.py && python import_profile.py
DATA_PREFIX=zemmour POLITICIAN_SLUG=eric-zemmour BIO_JSON=data/zemmour_bio.json python import_promises.py
DATA_PREFIX=zemmour POLITICIAN_SLUG=eric-zemmour BIO_JSON=data/zemmour_bio.json python import_profile.py
```

Verify: `https://<your-api>.onrender.com/api/politicians` lists Macron (156
promises) and Éric Zemmour (18).

---

## 4. Vercel — deploy the frontend

1. Vercel → **Add New → Project** → import the same repo.
2. **Root Directory = `frontend`** (Vercel detects Next.js automatically;
   [`frontend/vercel.json`](./frontend/vercel.json) pins the framework). Leave
   the build/output settings at the Next.js defaults.
3. Environment Variables → add:
   - `NEXT_PUBLIC_API_BASE_URL` = your Render API URL (no trailing slash), e.g.
     `https://kept-vote-api.onrender.com`
4. Deploy. The site will SSR-fetch from the Render API.

---

## 5. Wire CORS back to the Vercel domain

Once Vercel gives you the production domain (e.g. `https://kept-vote.vercel.app`
and any preview/custom domains):

1. Render → `kept-vote-api` → Environment → set
   `CORS_ORIGINS=https://kept-vote.vercel.app` (comma-separate multiple, e.g.
   add a custom domain). Save → Render redeploys.

Done. Visit the Vercel URL — the politician list and profiles render from the
Render API backed by Neon.

---

## Environment variables reference

| Service | Variable | Required | Example |
|---|---|---|---|
| Render (API) | `DATABASE_URL` | yes | `postgresql://u:p@ep-x.aws.neon.tech/neondb?sslmode=require` |
| Render (API) | `ENVIRONMENT` | yes (set in yaml) | `production` |
| Render (API) | `CORS_ORIGINS` | recommended | `https://kept-vote.vercel.app` |
| Render (API) | `ANTHROPIC_API_KEY` | optional | `sk-ant-...` |
| Render (API) | `DB_SSL` | optional override | `true` / `false` (auto-derived from URL otherwise) |
| Vercel (web) | `NEXT_PUBLIC_API_BASE_URL` | yes | `https://kept-vote-api.onrender.com` |

## Notes / gotchas

- **Neon SSL:** keep `?sslmode=require` in `DATABASE_URL`; the app strips it from
  the URL and enables TLS via asyncpg. To force on/off explicitly, set `DB_SSL`.
- **Render free tier** sleeps after inactivity; the first request after idle is
  slow (cold start). Health checks keep it warm while traffic flows.
- **No DB volume / secrets in git:** `.env`, `node_modules`, and DB data are
  gitignored; all secrets are set in the Render/Vercel dashboards.
- **Schema creation** is automatic on API startup (`create_all` + the
  `external_id` `ALTER`); only the *data* needs the one-time importer run.
