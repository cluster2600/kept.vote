-- Cloudflare D1 schema for the kept.vote website.
--
-- The site reads pre-rendered API responses: build_d1.py runs the importers and
-- the FastAPI read endpoints over data/*.json, then stores each response body
-- here under its API path (e.g. "/api/politicians/donald-tusk/promises").
-- Bodies larger than a D1 statement allows are split into ordered chunks.
--
-- Every deploy writes a new data version, then switches meta.version to it in
-- one statement, so readers never see a half-loaded dataset.

CREATE TABLE IF NOT EXISTS docs (
  version TEXT NOT NULL,
  path TEXT NOT NULL,
  seq INTEGER NOT NULL,
  -- Politician slug for politician-scoped documents (one query per page).
  politician TEXT,
  body TEXT NOT NULL,
  PRIMARY KEY (version, path, seq)
);

CREATE INDEX IF NOT EXISTS docs_by_politician ON docs (version, politician);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
