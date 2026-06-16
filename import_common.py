"""Shared helpers for the dataset importers.

Importers are parameterised by environment variables so the same code imports
any politician's datasets:

* ``DATA_PREFIX``     — dataset filename prefix (default ``macron``); files are
  read as ``data/<prefix>_<section>.json``.
* ``POLITICIAN_SLUG`` — stable slug stored as ``Politician.external_id`` (default
  ``emmanuel-macron``); imports target/create the politician by this slug.
* ``BIO_JSON``        — optional path to a bio object ``{name, country, party,
  birth_date, bio}`` used to create the politician if absent.
* ``DATA_DIR``        — dataset directory (default ``data``).
"""

from __future__ import annotations

import datetime
import json
import os

from sqlalchemy import select

from database import Politician

DATA_DIR = os.getenv("DATA_DIR", "data")
DATA_PREFIX = os.getenv("DATA_PREFIX", "macron")
POLITICIAN_SLUG = os.getenv("POLITICIAN_SLUG", "emmanuel-macron")
BIO_JSON = os.getenv("BIO_JSON")

# The built-in DEFAULT_BIO is Macron-only and exists purely for backward
# compatibility with the original seed flow. It must NEVER stand in for any
# other slug: doing so would name-match and hijack an existing row. So the
# default bio is only ever used when the active slug is this one.
DEFAULT_SLUG = "emmanuel-macron"

# Used when BIO_JSON is unset (Macron — backward compatibility).
DEFAULT_BIO = {
    "name": "Emmanuel Macron",
    "country": "France",
    "party": "Renaissance",
    "birth_date": "1977-12-21",
    "bio": (
        "President of France since 2017, re-elected in 2022. Founder of the "
        "centrist movement now known as Renaissance."
    ),
}


def parse_date(value: object) -> datetime.date | None:
    """Parse an ISO ``YYYY-MM-DD`` string (or pass through a date) to a date."""
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, str):
        try:
            return datetime.date.fromisoformat(value)
        except ValueError:
            return None
    return None


def slug_of(entry: dict) -> str | None:
    """Return a string external-id slug for a record, or None if it has no id.

    Datasets vary: some use string slugs (e.g. "corporate-tax-25"), others use
    integer sequence ids (1, 2, 3). The DB stores external_id as text, so coerce
    to str. Per-(politician, section) scoping keeps these unique for upsert.
    """
    value = entry.get("id")
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def as_list(value: object) -> list[str] | None:
    """Normalize a value that may be a string or list into a list of strings."""
    if isinstance(value, list):
        items = [str(v).strip() for v in value if str(v).strip()]
        return items or None
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return None


def load_bio() -> dict:
    """Load the bio object (from BIO_JSON, or the Macron default)."""
    if BIO_JSON:
        with open(BIO_JSON, encoding="utf-8") as fh:
            data = json.load(fh)
        return data[0] if isinstance(data, list) else data
    return DEFAULT_BIO


def data_path(section: str) -> str:
    """Path to a dataset for the active prefix, e.g. data/zemmour_promises.json."""
    return os.path.join(DATA_DIR, f"{DATA_PREFIX}_{section}.json")


async def get_or_create_politician(session) -> Politician:
    """Get-or-create the target politician by slug (idempotent).

    Falls back to matching by name and backfilling the slug, so the pre-existing
    Macron row (created before slugs existed) is reused, never duplicated.
    """
    p = (
        await session.execute(
            select(Politician).where(Politician.external_id == POLITICIAN_SLUG)
        )
    ).scalars().first()
    if p is not None:
        return p

    # Slug not found — we may have to create the politician. Guard rail: only the
    # Macron slug may fall back to the built-in DEFAULT_BIO. For any other slug
    # with no explicit BIO_JSON, refuse rather than risk the default bio
    # name-matching and hijacking an unrelated existing row (which is exactly how
    # a non-Macron slug could overwrite Macron's record). Require a real bio file.
    if BIO_JSON is None and POLITICIAN_SLUG != DEFAULT_SLUG:
        raise SystemExit(
            f"Politician slug '{POLITICIAN_SLUG}' not found and no BIO_JSON was "
            f"given. Refusing to fall back to the default (Macron) bio — that "
            f"would risk hijacking another politician's row. Pass "
            f"BIO_JSON=data/{POLITICIAN_SLUG}_bio.json to create this politician."
        )

    bio = load_bio()
    name = bio.get("name")
    if name:
        p = (
            await session.execute(select(Politician).where(Politician.name == name))
        ).scalars().first()
        if p is not None:
            p.external_id = POLITICIAN_SLUG
            await session.flush()
            return p

    p = Politician(
        external_id=POLITICIAN_SLUG,
        name=name or POLITICIAN_SLUG,
        country=bio.get("country"),
        party=bio.get("party"),
        birth_date=parse_date(bio.get("birth_date")),
        bio=bio.get("bio"),
    )
    session.add(p)
    await session.flush()
    return p
