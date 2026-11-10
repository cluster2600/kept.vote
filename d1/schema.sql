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
  -- UI locale this body is written for, or 'src' for the untranslated
  -- original (the profile's own content_lang). A locale only has rows where
  -- translate.py has actually translated something; readers fall back to
  -- 'src', so publishing a locale is a per-build choice (build_d1.py --lang).
  lang TEXT NOT NULL DEFAULT 'src',
  body TEXT NOT NULL,
  PRIMARY KEY (version, path, seq, lang)
);

-- A politician page reads every document it needs in one query, for the
-- active locale and the 'src' fallback together.
CREATE INDEX IF NOT EXISTS docs_by_politician ON docs (version, politician, lang);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
