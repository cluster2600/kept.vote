-- Add the `lang` column to `docs` (translated profile text).
--
-- `d1/schema.sql` creates `docs` with IF NOT EXISTS, so an already-deployed
-- database does not pick the column up. Run this once against such a database,
-- before the first seed that carries translations:
--
--   npx wrangler d1 execute kept-vote --remote \
--     -c d1/wrangler.local.jsonc --file d1/migrations/0001_docs_lang.sql
--
-- It is a no-op on a database created from the current schema.sql. Rows that
-- predate the column are the untranslated originals, hence the 'src' default.
-- The primary key has to change too, so the table is rebuilt: on a fresh deploy
-- the next seed repopulates it anyway, and until then readers keep seeing the
-- current data version.

ALTER TABLE docs ADD COLUMN lang TEXT NOT NULL DEFAULT 'src';

DROP INDEX IF EXISTS docs_by_politician;

CREATE TABLE docs_new (
  version TEXT NOT NULL,
  path TEXT NOT NULL,
  seq INTEGER NOT NULL,
  politician TEXT,
  lang TEXT NOT NULL DEFAULT 'src',
  body TEXT NOT NULL,
  PRIMARY KEY (version, path, seq, lang)
);

INSERT INTO docs_new (version, path, seq, politician, lang, body)
  SELECT version, path, seq, politician, lang, body FROM docs;

DROP TABLE docs;

ALTER TABLE docs_new RENAME TO docs;

CREATE INDEX IF NOT EXISTS docs_by_politician ON docs (version, politician, lang);
