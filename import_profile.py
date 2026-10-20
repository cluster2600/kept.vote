#!/usr/bin/env python3
"""Import a politician's profile sections (career, finances, controversies...).

Loads the section datasets for the active ``DATA_PREFIX`` (default Macron, see
``import_common``) and upserts them under that politician. Like ``import_promises.py`` this is idempotent: each row is
matched by its dataset slug (stored in ``external_id``), so re-running updates
in place rather than duplicating, and any existing rows whose slug is not in the
incoming dataset are pruned.

Talks to the database directly (async SQLAlchemy). Run inside the API container::

    docker compose exec api python import_profile.py

Editorial note: the controversies (polemics) dataset is imported verbatim —
``description``, ``key_facts`` and ``status`` are stored exactly as provided so
the neutral, allegation-aware framing and legal status are preserved.
"""

from __future__ import annotations

import asyncio
import json
import os

from sqlalchemy import select

from database import (
    Company,
    Education,
    ElectoralHistory,
    FinanceEntry,
    Honor,
    Interest,
    JusticeCase,
    KeyLegislation,
    NetWorthTimeline,
    Polemic,
    RealEstate,
    StockHolding,
    WorkHistory,
    init_db,
)
from database import SessionLocal
from import_common import (
    as_list as _as_list,
    data_path,
    get_or_create_politician,
    parse_confidence,
    pick,
    slug_of,
)


def _load(section: str) -> list[dict]:
    """Load a section dataset for the active prefix (e.g. zemmour_finances)."""
    path = data_path(section)
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise SystemExit(f"{path} must contain a JSON array.")
    return data


async def _upsert_section(
    session,
    politician_id,
    model,
    entries: list[dict],
    field_map,
) -> tuple[int, int, int]:
    """Upsert one section's rows by ``external_id`` slug, pruning stale rows.

    ``field_map(entry) -> dict`` maps a raw dataset record onto model column
    values (excluding ``politician_id`` / ``external_id``).

    Returns ``(created, updated, pruned)``.
    """
    incoming_slugs = {slug_of(e) for e in entries if slug_of(e)}

    existing = list(
        (
            await session.execute(
                select(model).where(model.politician_id == politician_id)
            )
        )
        .scalars()
        .all()
    )
    existing_by_slug = {r.external_id: r for r in existing if r.external_id}

    pruned = 0
    for row in existing:
        if row.external_id not in incoming_slugs:
            await session.delete(row)
            pruned += 1
    await session.flush()

    created = updated = 0
    for entry in entries:
        slug = slug_of(entry)
        if slug is None:
            continue  # can't upsert without a stable id
        row = existing_by_slug.get(slug)
        if row is None:
            row = model(politician_id=politician_id, external_id=slug)
            session.add(row)
            created += 1
        else:
            updated += 1
        for column, value in field_map(entry).items():
            # Some datasets use ints where the column is text (e.g. year=2026).
            # Coerce scalars to str; leave lists/dicts (JSONB) and floats
            # (confidence_score) untouched.
            if (
                value is not None
                and not isinstance(value, (list, dict, float, bool))
            ):
                value = str(value)
            setattr(row, column, value)
    await session.flush()
    return created, updated, pruned


# Field maps. Each column lists every spelling the datasets use, canonical
# first (see ``pick``); the alternates come from batches that named fields
# differently and were previously dropped on import.
def _work_fields(e: dict) -> dict:
    return {
        "role": pick(e, "role", "title") or "(role)",
        "organization": e.get("organization"),
        "start_date": e.get("start_date"),
        "end_date": e.get("end_date"),
        "description": e.get("description"),
        "category": e.get("category"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _finance_fields(e: dict) -> dict:
    return {
        # The dataset uses "year"; our column is the more general year_or_period.
        "year_or_period": pick(e, "year", "year_or_period", "declaration_date", "date"),
        "type": pick(e, "type", "category"),
        "label": pick(e, "label", "description", "summary"),
        "amount": pick(e, "amount", "value"),
        "detail": pick(e, "detail", "notes"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _polemic_fields(e: dict) -> dict:
    return {
        "title": e.get("title") or "(untitled)",
        "period": pick(e, "period", "date"),
        "category": pick(e, "category", "type"),
        "description": e.get("description"),
        "status": e.get("status"),
        "confidence_score": parse_confidence(e.get("confidence_score")),
        "key_facts": _as_list(e.get("key_facts")),
        "source_urls": _as_list(e.get("source_url")),
    }


def _stock_fields(e: dict) -> dict:
    return {
        "holding": pick(e, "holding", "company", "instrument") or "(holding)",
        "type": e.get("type"),
        "value": e.get("value"),
        "as_of": e.get("as_of"),
        "detail": pick(e, "detail", "shares"),
        "status": pick(e, "status", "declared_or_estimated"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _real_estate_fields(e: dict) -> dict:
    return {
        "property": pick(e, "property", "description", "type") or "(property)",
        "location": e.get("location"),
        "transaction_type": pick(e, "transaction_type", "ownership"),
        "date": e.get("date"),
        "value": pick(e, "value", "estimated_value"),
        "detail": pick(e, "detail", "notes"),
        "status": pick(e, "status", "declared_or_estimated"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _company_fields(e: dict) -> dict:
    return {
        "entity": pick(e, "entity", "organization") or "(entity)",
        "role": e.get("role"),
        "ownership_stake": e.get("ownership_stake"),
        "period": e.get("period"),
        "status": e.get("status"),
        "detail": pick(e, "detail", "description"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _electoral_fields(e: dict) -> dict:
    return {
        "election": pick(e, "election", "office") or "(election)",
        "date": pick(e, "date", "election_date"),
        "role_sought": pick(e, "role_sought", "office"),
        "result": e.get("result"),
        "vote_share": pick(e, "vote_share", "votes"),
        "opponent": e.get("opponent"),
        "detail": pick(e, "detail", "notes", "jurisdiction"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _interest_fields(e: dict) -> dict:
    return {
        "item": pick(e, "item", "interest", "organization", "area") or "(item)",
        "type": pick(e, "type", "category"),
        "period": pick(e, "period", "date"),
        "value": e.get("value"),
        "detail": pick(e, "detail", "description"),
        "status": e.get("status"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _years(e: dict) -> object:
    """``years``, or a range built from ``start_date``/``end_date``."""
    if e.get("years"):
        return e["years"]
    start, end = e.get("start_date"), e.get("end_date")
    if start and end and str(start) != str(end):
        return f"{start}–{end}"
    return start or end


def _education_fields(e: dict) -> dict:
    return {
        "institution": e.get("institution") or "(institution)",
        "qualification": pick(e, "qualification", "degree"),
        "field": e.get("field"),
        "years": _years(e),
        "detail": pick(e, "detail", "description"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _honor_fields(e: dict) -> dict:
    return {
        "honor": pick(e, "honor", "title") or "(honor)",
        "awarded_by": pick(e, "awarded_by", "awarding_body"),
        "year": pick(e, "year", "date"),
        "detail": pick(e, "detail", "description"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _legislation_fields(e: dict) -> dict:
    # Some datasets use a single explicit "no legislation" record carrying only
    # a `note` (no law_name/description) — map it to a clear titled card.
    return {
        "law_name": pick(e, "law_name", "title") or "No legislation authored",
        "year": pick(e, "year", "date"),
        "area": pick(e, "area", "category", "type"),
        "description": e.get("description") or e.get("note"),
        "significance": e.get("significance"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _net_worth_fields(e: dict) -> dict:
    return {
        "year": pick(e, "year", "date"),
        "declared_net_worth": pick(e, "declared_net_worth", "net_worth", "amount"),
        "note": pick(e, "note", "notes"),
        "status": pick(e, "status", "declared_or_estimated"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _justice_fields(e: dict) -> dict:
    # Maps a justice-record onto the JusticeCase columns. The dataset key "case"
    # holds the matter's title; everything else is preserved verbatim so the
    # neutral, presumption-of-innocence framing is never altered.
    return {
        "case_title": e.get("case") or e.get("title") or "(case)",
        "period": e.get("period"),
        "type": e.get("type"),
        "description": e.get("description"),
        "status": e.get("status"),
        "outcome": e.get("outcome"),
        "court": e.get("court"),
        "presumption_note": e.get("presumption_note"),
        "key_facts": _as_list(e.get("key_facts")),
        "source_urls": _as_list(e.get("source_url")),
    }


def _has_source(entry: dict) -> bool:
    """True if the record carries at least one non-empty source URL."""
    return bool(_as_list(entry.get("source_url")))


# (display name, file-section token, model, field_map). The file token is the
# ``data/<prefix>_<token>.json`` suffix; the display name is for the summary.
_SECTION_SPECS = [
    ("work history", "work_history", WorkHistory, _work_fields),
    ("finances", "finances", FinanceEntry, _finance_fields),
    ("controversies", "polemics", Polemic, _polemic_fields),
    ("stocks", "stocks_portfolio", StockHolding, _stock_fields),
    ("real estate", "real_estate", RealEstate, _real_estate_fields),
    ("companies", "companies", Company, _company_fields),
    ("electoral history", "electoral_history", ElectoralHistory, _electoral_fields),
    ("interests", "interests", Interest, _interest_fields),
    ("education", "education", Education, _education_fields),
    ("honors", "honors", Honor, _honor_fields),
    ("key legislation", "key_legislation", KeyLegislation, _legislation_fields),
    ("net worth", "net_worth_timeline", NetWorthTimeline, _net_worth_fields),
    ("justice", "justice", JusticeCase, _justice_fields),
]

# Legal sections must never publish an unsourced claim — drop records lacking a
# source URL. Optional sections are imported (in a full run) only if their file
# exists, so a standard profile import never requires them.
_DROP_UNSOURCED = {"polemics", "justice"}
_OPTIONAL = {"justice"}


def _load_section(token: str) -> list[dict]:
    """Load one section's records, dropping unsourced rows for legal sections."""
    raw = _load(token)
    if token in _DROP_UNSOURCED:
        kept = [r for r in raw if _has_source(r)]
        dropped = [r for r in raw if not _has_source(r)]
        if dropped:
            label = "justice case" if token == "justice" else "polemic"
            titles = "; ".join(
                (r.get("case") or r.get("title") or "(untitled)")[:60]
                for r in dropped
            )
            print(f"Dropped {len(dropped)} unsourced {label}(s): {titles}")
        return kept
    return raw


async def main() -> None:
    # Optional ``SECTIONS`` env (comma-separated file tokens, e.g.
    # "justice,companies") restricts the import to just those sections — used by
    # targeted enrichment batches that must not touch a politician's other
    # sections. Unset = full profile import (all standard sections; an optional
    # section such as justice is imported only when its file is present).
    requested = None
    if os.getenv("SECTIONS"):
        requested = {s.strip() for s in os.getenv("SECTIONS").split(",") if s.strip()}

    to_run = []  # (display, model, entries, field_map)
    for display, token, model, fmap in _SECTION_SPECS:
        if requested is not None:
            if token not in requested:
                continue
            if not os.path.exists(data_path(token)):
                print(f"Skipped requested section '{token}': no file at {data_path(token)}")
                continue
        elif token in _OPTIONAL and not os.path.exists(data_path(token)):
            continue
        to_run.append((display, model, _load_section(token), fmap))

    await init_db()  # ensure the new tables exist (no-op if already created)

    async with SessionLocal() as session:
        politician = await get_or_create_politician(session)
        print(f"Target politician: {politician.name} ({politician.id})")

        results = []
        for display, model, entries, fmap in to_run:
            c, u, p = await _upsert_section(
                session, politician.id, model, entries, fmap
            )
            results.append((display, len(entries), c, u, p))

        await session.commit()

    print("\nImported profile sections:")
    for name, total, c, u, p in results:
        print(f"  {name:<18} {total:>3} items  ({c} created, {u} updated, {p} pruned)")


if __name__ == "__main__":
    asyncio.run(main())
