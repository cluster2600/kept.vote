# Deploying kept.vote

Production runs entirely on Cloudflare: one **Worker** (the Next.js site, built
with [vinext](https://github.com/cloudflare/vinext)) reading a **D1** database,
served on `kept.vote` (`www.kept.vote` redirects to it).

```
Browser ──> kept.vote (Worker: vinext / Next.js App Router) ──> D1 "kept-vote"
```

There is no API server or Postgres in production. The site's data is the
read API's JSON, rendered ahead of time from `data/*.json` by
[`build_d1.py`](./build_d1.py) and loaded into D1. The FastAPI app and
docker-compose stack remain for local tooling (importers, document upload, AI
verification).

| Piece | Where | Config |
| --- | --- | --- |
| Worker `kept-vote` | Cloudflare Workers (Paid plan) | [`frontend/cloudflare.config.ts`](./frontend/cloudflare.config.ts) |
| Database `kept-vote` | Cloudflare D1, Western Europe | [`d1/schema.sql`](./d1/schema.sql) |
| Domains `kept.vote`, `www.kept.vote` | Workers custom domains | `domains` in `cloudflare.config.ts` |

> **Plan:** the account must be on **Workers Paid** ($5/month). Rendering a page
> takes 40–250 ms of CPU; the free plan allows 10 ms and starts failing requests
> with error 1102 once traffic is steady.

---

## Prerequisites

- Node 24 and the frontend dependencies: `cd frontend && npm install`
- Python 3.10+ with the API dependencies: `pip install -r requirements.txt`
- Logged in to Cloudflare: `npx wrangler login` (seeding D1) and
  `npx cf auth login` (deploying with `cloudflare.config.ts`)

## Publish a data change

After adding or editing a profile in `data/` (see
[`docs/PROFILE_FORMAT.md`](./docs/PROFILE_FORMAT.md)):

```bash
python validate_profile.py --strict <slug>   # new profiles must pass
python build_d1.py                           # writes d1/build/seed.sql
cd frontend && npm run db:remote             # loads it into the live D1
```

`db:remote` applies the schema (idempotent) and the seed. The seed writes a new
data version and switches the site to it in one statement, then deletes the old
version, so the site never shows a half-loaded dataset. No Worker deploy is
needed for data-only changes.

## Deploy a code change

```bash
cd frontend
npm run deploy     # vite build + upload the Worker and its static assets
```

This also (re)applies the custom domains. The deploy prints the Worker version
ID; roll back from the dashboard (Workers & Pages → kept-vote → Deployments) if
needed.

## Local development

```bash
python build_d1.py            # once, and after data changes
cd frontend
npm run db:local              # load the seed into the local D1
npm run dev                   # http://localhost:3001
npm run preview               # production build in local workerd
```

Local D1 state lives in `frontend/.cloudflare/state` (gitignored).

## Monitoring

- **Logs and traces:** Workers & Pages → kept-vote → Observability, or
  `npx wrangler tail kept-vote` for live requests (shows CPU time per request).
- **Usage:** D1 rows read/written and Worker requests/CPU under Workers & Pages
  → kept-vote → Metrics. Quotas are per account and shared with other projects
  on the same account.

## Notes / gotchas

- **Stable URLs.** Politician pages use the profile slug
  (`/fr/politicians/donald-tusk`), promise pages `<slug>--<promise id>`.
  Renaming a slug or a promise id changes its URL.
- **D1 limits.** A SQL statement is capped at 100 KB, so `build_d1.py` splits
  large documents into chunks; `lib/data.ts` joins them. Each page makes 2–3
  queries.
- **The frontend no longer runs on `next dev` / `next build`.** Code reads D1
  through `cloudflare:workers`, which only exists in the Workers runtime. Use
  the vinext scripts above.
- **Retired:** the Vercel project, the Render `kept-vote-api` service and the
  Neon database are no longer used and can be deleted from their dashboards.
