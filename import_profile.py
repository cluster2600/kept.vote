#!/usr/bin/env python3
"""Import Macron's profile sections: work history, finances, controversies.

Loads three JSON datasets (default under ``data/``) and upserts them under
Emmanuel Macron. Like ``import_promises.py`` this is idempotent: each row is
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
    KeyLegislation,
    NetWorthTimeline,
    Politician,
    Polemic,
    RealEstate,
    StockHolding,
    WorkHistory,
    init_db,
)
from database import SessionLocal

DATA_DIR = os.getenv("PROFILE_DATA_DIR", "data")

POLITICIAN = {
    "name": "Emmanuel Macron",
    "country": "France",
    "party": "Renaissance",
}


def _as_list(value: object) -> list[str] | None:
    """Normalize a value that may be a string or list into a list of strings."""
    if isinstance(value, list):
        items = [str(v).strip() for v in value if str(v).strip()]
        return items or None
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return None


def _clamp(value: object) -> float | None:
    """Clamp a confidence value into [0, 1] (or None if absent/invalid)."""
    if value is None:
        return None
    try:
        return max(0.0, min(1.0, float(value)))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _load(name: str) -> list[dict]:
    """Load a JSON array dataset from the data directory."""
    path = os.path.join(DATA_DIR, name)
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
    incoming_slugs = {e["id"] for e in entries if e.get("id")}

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
        slug = entry.get("id")
        row = existing_by_slug.get(slug)
        if row is None:
            row = model(politician_id=politician_id, external_id=slug)
            session.add(row)
            created += 1
        else:
            updated += 1
        for column, value in field_map(entry).items():
            setattr(row, column, value)
    await session.flush()
    return created, updated, pruned


def _work_fields(e: dict) -> dict:
    return {
        "role": e.get("role") or "(role)",
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
        "year_or_period": e.get("year") or e.get("year_or_period"),
        "type": e.get("type"),
        "label": e.get("label"),
        "amount": e.get("amount"),
        "detail": e.get("detail"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _polemic_fields(e: dict) -> dict:
    return {
        "title": e.get("title") or "(untitled)",
        "period": e.get("period"),
        "category": e.get("category"),
        "description": e.get("description"),
        "status": e.get("status"),
        "confidence_score": _clamp(e.get("confidence_score")),
        "key_facts": _as_list(e.get("key_facts")),
        "source_urls": _as_list(e.get("source_url")),
    }


def _stock_fields(e: dict) -> dict:
    return {
        "holding": e.get("holding") or "(holding)",
        "type": e.get("type"),
        "value": e.get("value"),
        "as_of": e.get("as_of"),
        "detail": e.get("detail"),
        "status": e.get("status"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _real_estate_fields(e: dict) -> dict:
    return {
        "property": e.get("property") or "(property)",
        "location": e.get("location"),
        "transaction_type": e.get("transaction_type"),
        "date": e.get("date"),
        "value": e.get("value"),
        "detail": e.get("detail"),
        "status": e.get("status"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _company_fields(e: dict) -> dict:
    return {
        "entity": e.get("entity") or "(entity)",
        "role": e.get("role"),
        "ownership_stake": e.get("ownership_stake"),
        "period": e.get("period"),
        "status": e.get("status"),
        "detail": e.get("detail"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _electoral_fields(e: dict) -> dict:
    return {
        "election": e.get("election") or "(election)",
        "date": e.get("date"),
        "role_sought": e.get("role_sought"),
        "result": e.get("result"),
        "vote_share": e.get("vote_share"),
        "opponent": e.get("opponent"),
        "detail": e.get("detail"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _interest_fields(e: dict) -> dict:
    return {
        "item": e.get("item") or "(item)",
        "type": e.get("type"),
        "period": e.get("period"),
        "value": e.get("value"),
        "detail": e.get("detail"),
        "status": e.get("status"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _education_fields(e: dict) -> dict:
    return {
        "institution": e.get("institution") or "(institution)",
        "qualification": e.get("qualification"),
        "field": e.get("field"),
        "years": e.get("years"),
        "detail": e.get("detail"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _honor_fields(e: dict) -> dict:
    return {
        "honor": e.get("honor") or "(honor)",
        "awarded_by": e.get("awarded_by"),
        "year": e.get("year"),
        "detail": e.get("detail"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _legislation_fields(e: dict) -> dict:
    return {
        "law_name": e.get("law_name") or "(law)",
        "year": e.get("year"),
        "area": e.get("area"),
        "description": e.get("description"),
        "significance": e.get("significance"),
        "source_urls": _as_list(e.get("source_url")),
    }


def _net_worth_fields(e: dict) -> dict:
    return {
        "year": e.get("year"),
        "declared_net_worth": e.get("declared_net_worth"),
        "note": e.get("note"),
        "status": e.get("status"),
        "source_urls": _as_list(e.get("source_url")),
    }


async def main() -> None:
    work = _load("macron_work_history.json")
    finances = _load("macron_finances.json")
    polemics = _load("macron_polemics.json")
    stocks = _load("macron_stocks_portfolio.json")
    real_estate = _load("macron_real_estate.json")
    companies = _load("macron_companies.json")
    electoral = _load("macron_electoral_history.json")
    interests = _load("macron_interests.json")
    education = _load("macron_education.json")
    honors = _load("macron_honors.json")
    legislation = _load("macron_key_legislation.json")
    net_worth = _load("macron_net_worth_timeline.json")

    await init_db()  # ensure the new tables exist (no-op if already created)

    async with SessionLocal() as session:
        macron = (
            await session.execute(
                select(Politician).where(Politician.name == POLITICIAN["name"])
            )
        ).scalars().first()
        if macron is None:
            macron = Politician(**POLITICIAN)
            session.add(macron)
            await session.flush()
            print(f"Created politician: {macron.name}")
        else:
            print(f"Reusing existing politician: {macron.name} ({macron.id})")

        sections = [
            ("work history", WorkHistory, work, _work_fields),
            ("finances", FinanceEntry, finances, _finance_fields),
            ("controversies", Polemic, polemics, _polemic_fields),
            ("stocks", StockHolding, stocks, _stock_fields),
            ("real estate", RealEstate, real_estate, _real_estate_fields),
            ("companies", Company, companies, _company_fields),
            ("electoral history", ElectoralHistory, electoral, _electoral_fields),
            ("interests", Interest, interests, _interest_fields),
            ("education", Education, education, _education_fields),
            ("honors", Honor, honors, _honor_fields),
            ("key legislation", KeyLegislation, legislation, _legislation_fields),
            ("net worth", NetWorthTimeline, net_worth, _net_worth_fields),
        ]
        results = []
        for name, model, entries, fmap in sections:
            c, u, p = await _upsert_section(
                session, macron.id, model, entries, fmap
            )
            results.append((name, len(entries), c, u, p))

        await session.commit()

    print("\nImported profile sections:")
    for name, total, c, u, p in results:
        print(f"  {name:<14} {total:>3} items  ({c} created, {u} updated, {p} pruned)")


if __name__ == "__main__":
    asyncio.run(main())
