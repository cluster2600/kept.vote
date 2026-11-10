#!/usr/bin/env python3
"""Render the site's data into SQL for Cloudflare D1.

The production site (frontend/, a Worker) reads its data from D1 instead of
calling the FastAPI backend. This script produces that data without a database
server or a running API:

1. Imports every profile in ``data/`` into a throwaway SQLite database using
   the regular importers (same field maps, validation and pruning).
2. Calls each read endpoint the website uses through the FastAPI app itself
   (in-process, no network), so the stored JSON is exactly what the API serves.
3. Replaces database UUIDs with stable ids — the politician's slug, and
   ``<slug>--<promise id>`` for promises — so URLs survive rebuilds.
4. Writes ``d1/build/seed.sql``, which loads the documents under a new data
   version and switches the site to it (see ``d1/schema.sql``).

Usage::

    python build_d1.py
    npx wrangler d1 execute kept-vote --remote --file d1/schema.sql
    npx wrangler d1 execute kept-vote --remote --file d1/build/seed.sql

Requires the API's Python dependencies plus ``aiosqlite``.
"""

from __future__ import annotations

import asyncio
import contextlib
import datetime
import io
import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BUILD_DIR = ROOT / "d1" / "build"

# Point the app at a throwaway SQLite database before any app module reads its
# settings. "production" keeps SQLAlchemy from echoing every statement.
_tmp = tempfile.TemporaryDirectory(prefix="kept-vote-d1-")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_tmp.name}/build.db"
os.environ["ENVIRONMENT"] = "production"
os.chdir(ROOT)

import httpx2  # noqa: E402
from sqlalchemy import select  # noqa: E402

import import_common  # noqa: E402
import import_profile  # noqa: E402
import import_promises  # noqa: E402
from database import Politician, Promise, SessionLocal, engine, init_db  # noqa: E402
from main import app  # noqa: E402
from validate_profile import SECTIONS, all_slugs  # noqa: E402

# Older profiles keep most sections under a short file prefix and a few under
# the full slug. Both are imported into the same politician.
PREFIX_ALIASES = {
    "macron": "emmanuel-macron",
    "lepen": "marine-le-pen",
    "zemmour": "eric-zemmour",
}

# Politician-scoped read endpoints the website calls (frontend/lib/api.ts).
POLITICIAN_ENDPOINTS = [
    "",
    "/promises",
    "/work-history",
    "/finances",
    "/polemics",
    "/stocks",
    "/real-estate",
    "/companies",
    "/sources",
    "/electoral-history",
    "/interests",
    "/education",
    "/honors",
    "/key-legislation",
    "/net-worth",
    "/justice",
]

# D1 caps a SQL statement at 100 KB; leave room for the INSERT around the body.
CHUNK_BYTES = 90_000

# The untranslated original, in the profile's own content_lang.
SOURCE_LANG = "src"


def translate_body(body: str, memory: dict[str, str]) -> str | None:
    """Return ``body`` with known strings replaced, or None if nothing changed.

    The translation memory is keyed by a hash of the source string (see
    ``translate.py``), so this walks the rendered JSON and swaps any string
    value it has a translation for. Nothing else is touched: ids, dates,
    URLs, numbers, names and the controlled status values were never added to
    the memory in the first place, so they cannot be altered here.

    Returning None for an unchanged body keeps the seed small — a locale only
    gets rows where it actually differs, and readers fall back to the source.
    """
    import translate as translate_module

    changed = False

    def walk(node):
        nonlocal changed
        if isinstance(node, str):
            replacement = memory.get(translate_module.fingerprint(node.strip()))
            if replacement:
                changed = True
                return replacement
            return node
        if isinstance(node, list):
            return [walk(item) for item in node]
        if isinstance(node, dict):
            return {key: walk(value) for key, value in node.items()}
        return node

    translated = walk(json.loads(body))
    if not changed:
        return None
    return json.dumps(translated, ensure_ascii=False, separators=(",", ":"))


def profile_groups() -> dict[str, list[str]]:
    """Map each politician slug to the file prefixes holding its data."""
    groups: dict[str, list[str]] = {}
    for prefix in all_slugs():
        slug = PREFIX_ALIASES.get(prefix, prefix)
        groups.setdefault(slug, []).append(prefix)
    # Import the alias (main data) first, then the full-slug extras.
    for prefixes in groups.values():
        prefixes.sort(key=lambda p: p not in PREFIX_ALIASES)
    return groups


def _sections_present(prefix: str) -> list[str]:
    return [s for s in SECTIONS if s != "promises" and (ROOT / "data" / f"{prefix}_{s}.json").exists()]


async def import_profile_group(slug: str, prefixes: list[str]) -> None:
    """Import one politician from all of its file prefixes."""
    for index, prefix in enumerate(prefixes):
        bio = ROOT / "data" / f"{prefix}_bio.json"
        import_common.DATA_PREFIX = prefix
        import_common.POLITICIAN_SLUG = slug
        import_common.BIO_JSON = str(bio) if bio.exists() else None
        import_promises.JSON_PATH = import_common.data_path("promises")
        if index == 0:
            if (ROOT / "data" / f"{prefix}_promises.json").exists():
                await import_promises.main()
            os.environ.pop("SECTIONS", None)
        else:
            # Extra files under the full slug: import only those sections, so
            # the ones imported from the alias prefix are left in place.
            os.environ["SECTIONS"] = ",".join(_sections_present(prefix))
        await import_profile.main()
    os.environ.pop("SECTIONS", None)


async def import_all() -> None:
    await init_db()
    groups = profile_groups()
    log = io.StringIO()
    for slug, prefixes in sorted(groups.items()):
        with contextlib.redirect_stdout(log):
            await import_profile_group(slug, prefixes)
    print(f"Imported {len(groups)} politicians from data/.")


async def stable_ids() -> dict[str, str]:
    """Map database UUIDs to stable public ids."""
    ids: dict[str, str] = {}
    async with SessionLocal() as session:
        politicians = (await session.execute(select(Politician))).scalars().all()
        slugs = {p.id: p.external_id for p in politicians}
        for p in politicians:
            ids[str(p.id)] = p.external_id
        for promise in (await session.execute(select(Promise))).scalars().all():
            ids[str(promise.id)] = f"{slugs[promise.politician_id]}--{promise.external_id}"
    return ids


def restamp(body: str, ids: dict[str, str]) -> str:
    for uuid_text, stable in ids.items():
        body = body.replace(uuid_text, stable)
    return body


async def render_documents(ids: dict[str, str]) -> list[tuple[str, str | None, str]]:
    """Return (path, politician slug or None, JSON body) for every document."""
    docs: list[tuple[str, str | None, str]] = []
    transport = httpx2.ASGITransport(app=app)
    async with httpx2.AsyncClient(transport=transport, base_url="http://build") as client:

        async def get(path: str) -> str:
            response = await client.get(path)
            if response.status_code != 200:
                raise SystemExit(f"GET {path} returned {response.status_code}: {response.text[:200]}")
            # Re-serialise compactly: smaller rows, faster JSON.parse in the Worker.
            return json.dumps(response.json(), ensure_ascii=False, separators=(",", ":"))

        for path in ("/api/politicians", "/api/status"):
            docs.append((path, None, restamp(await get(path), ids)))

        politicians = json.loads(await get("/api/politicians"))
        for politician in politicians:
            uuid_text = politician["id"]
            slug = ids[uuid_text]
            for suffix in POLITICIAN_ENDPOINTS:
                body = await get(f"/api/politicians/{uuid_text}{suffix}")
                docs.append((f"/api/politicians/{slug}{suffix}", slug, restamp(body, ids)))
            promises = json.loads(await get(f"/api/politicians/{uuid_text}/promises"))
            for promise in promises:
                promise_uuid = promise["id"]
                stable = ids[promise_uuid]
                for suffix in ("", "/verification"):
                    body = await get(f"/api/promises/{promise_uuid}{suffix}")
                    docs.append((f"/api/promises/{stable}{suffix}", slug, restamp(body, ids)))
    return docs


def _sql_text(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def _chunks(body: str) -> list[str]:
    """Split a body into pieces whose SQL-escaped UTF-8 size fits a statement."""
    pieces: list[str] = []
    current: list[str] = []
    size = 0
    for char in body:
        char_size = len(char.encode("utf-8")) * (2 if char == "'" else 1)
        if size + char_size > CHUNK_BYTES and current:
            pieces.append("".join(current))
            current, size = [], 0
        current.append(char)
        size += char_size
    pieces.append("".join(current))
    return pieces


def write_seed(docs: list[tuple[str, str | None, str, str]], version: str) -> Path:
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    out = BUILD_DIR / "seed.sql"
    rows = 0
    with out.open("w", encoding="utf-8") as fh:
        fh.write(f"-- Generated by build_d1.py — data version {version}. Do not edit.\n")
        for path, politician, lang, body in docs:
            for seq, chunk in enumerate(_chunks(body)):
                fh.write(
                    "INSERT INTO docs (version, path, seq, politician, lang, body) VALUES ("
                    f"{_sql_text(version)}, {_sql_text(path)}, {seq}, "
                    f"{_sql_text(politician)}, {_sql_text(lang)}, {_sql_text(chunk)});\n"
                )
                rows += 1
        # Switch readers to the new version, then drop the previous ones.
        fh.write(
            "INSERT INTO meta (key, value) VALUES ('version', "
            f"{_sql_text(version)}) ON CONFLICT(key) DO UPDATE SET value = excluded.value;\n"
        )
        fh.write(f"DELETE FROM docs WHERE version <> {_sql_text(version)};\n")
    print(f"Wrote {out.relative_to(ROOT)}: {len(docs)} documents in {rows} rows.")
    return out


def localized_documents(
    docs: list[tuple[str, str | None, str]], langs: list[str]
) -> list[tuple[str, str | None, str, str]]:
    """Expand source documents with a translated copy per requested locale."""
    import translate as translate_module

    out: list[tuple[str, str | None, str, str]] = [
        (path, politician, SOURCE_LANG, body) for path, politician, body in docs
    ]
    for lang in langs:
        memory = translate_module.load_memory(lang)
        if not memory:
            print(
                f"  {lang}: no translations in translations/{lang}.json — "
                "run translate.py first; skipping.",
                file=sys.stderr,
            )
            continue
        added = 0
        for path, politician, body in docs:
            translated = translate_body(body, memory)
            if translated is not None:
                out.append((path, politician, lang, translated))
                added += 1
        print(f"  {lang}: {added} translated documents")
    return out


async def build(langs: list[str]) -> None:
    await import_all()
    ids = await stable_ids()
    docs = await render_documents(ids)
    await engine.dispose()
    if langs:
        print("Applying translations …")
    localized = localized_documents(docs, langs)
    version = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    write_seed(localized, version)


def _parse_args() -> list[str]:
    import argparse

    from translate import LANGUAGE_NAMES

    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--lang",
        action="append",
        dest="langs",
        metavar="CODE",
        default=[],
        help=(
            "also publish this locale's translated text, from "
            "translations/<CODE>.json (repeatable; 'all' for every locale "
            "that has a translation memory)"
        ),
    )
    args = parser.parse_args()
    if "all" in args.langs:
        return [
            lang
            for lang in LANGUAGE_NAMES
            if lang != "en" and (ROOT / "translations" / f"{lang}.json").exists()
        ]
    unknown = [lang for lang in args.langs if lang not in LANGUAGE_NAMES]
    if unknown:
        parser.error(f"unknown locale(s): {', '.join(unknown)}")
    return args.langs


if __name__ == "__main__":
    try:
        asyncio.run(build(_parse_args()))
    finally:
        _tmp.cleanup()
    sys.exit(0)
