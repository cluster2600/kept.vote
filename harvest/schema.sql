-- Cloudflare D1 schema for kept-vote-kitesurf, the information-harvest Worker.
-- Separate from the site's database: nothing here is shown on kept.vote
-- directly. Everything harvested is untrusted web content.

-- Pages to (re)harvest: every source cited in data/*.json, plus pages fetched
-- during research. Loaded by `python harvest.py sync`.
CREATE TABLE IF NOT EXISTS targets (
  url TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  -- official: government, parliament, courts, registers (re-checked weekly)
  -- source: any other cited page (monthly) / research: fetched on demand
  kind TEXT NOT NULL,
  -- JSON array of the profile slugs that cite this URL.
  profiles TEXT NOT NULL DEFAULT '[]',
  every_days INTEGER,
  added_at TEXT NOT NULL
);

-- Latest harvest of each URL.
CREATE TABLE IF NOT EXISTS snapshots (
  url TEXT PRIMARY KEY,
  checked_at TEXT NOT NULL,
  engine TEXT NOT NULL,
  -- reachable | dead | blocked | robots-disallowed | not-allowed | timeout
  -- | unreachable | error
  status TEXT NOT NULL,
  http_status INTEGER,
  final_url TEXT,
  title TEXT,
  -- First 2,000 characters of the rendered Markdown, not the full page.
  excerpt TEXT,
  -- SHA-256 of the normalized rendered text (of the file itself for a PDF,
  -- engine "direct"); a change flags the page.
  content_hash TEXT,
  previous_hash TEXT,
  changed_at TEXT,
  robots_status TEXT,
  browser_ms INTEGER
);

CREATE INDEX IF NOT EXISTS snapshots_by_checked ON snapshots (checked_at);
CREATE INDEX IF NOT EXISTS targets_by_kind ON targets (kind);

-- Domains the Worker may fetch. Seeded from the domains cited in data/ and
-- the official-domain rules; additions are logged with a reason.
CREATE TABLE IF NOT EXISTS allowed_domains (
  domain TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  added_at TEXT NOT NULL
);

-- One-time challenges proving the caller can write to this database (that is,
-- is signed in to the Cloudflare account). Exchanged for a 30-minute token.
CREATE TABLE IF NOT EXISTS auth_challenges (
  hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  trigger TEXT NOT NULL,
  checked INTEGER NOT NULL,
  reachable INTEGER NOT NULL,
  problems INTEGER NOT NULL,
  browser_ms INTEGER NOT NULL
);
