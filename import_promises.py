#!/usr/bin/env python3
"""Import a research dataset of promises for a single politician.

Loads promises from a JSON file (default ``data/macron_promises.json``) and
upserts them under Emmanuel Macron, **replacing** his existing promise set:

* The politician is reused (matched by name) — never duplicated.
* Each promise is matched by its dataset slug, stored in ``Promise.external_id``,
  so re-running updates in place instead of creating duplicates (idempotent).
* Any of the politician's existing promises whose ``external_id`` is not in the
  incoming dataset are deleted (this removes the earlier hand-seeded promises).
* Each promise's verification is fully replaced from the dataset.

This talks to the database directly (async SQLAlchemy) rather than the HTTP API,
because the upsert/replace semantics are cleaner expressed against the ORM. Run
it inside the API container so it shares the same DB connection settings::

    docker compose exec api python import_promises.py

Source-dataset status values are mapped onto our enum (notably ``kept`` ->
``fulfilled``; ``compromise`` is a first-class status).
"""

from __future__ import annotations

import asyncio
import datetime
import json
import os

from sqlalchemy import delete, select

from database import (
    HumanReviewStatus,
    Promise,
    Verification,
    VerificationStatus,
    init_db,
)
from database import SessionLocal
from import_common import (
    as_list as _as_list,
    data_path,
    get_or_create_politician,
    parse_date as _parse_date,
    slug_of,
)

JSON_PATH = os.getenv("PROMISES_JSON", data_path("promises"))

# Map dataset status strings onto our VerificationStatus enum. The dataset uses
# "kept"; our enum's equivalent is FULFILLED (rendered as "Kept" in the UI).
STATUS_MAP: dict[str, VerificationStatus] = {
    "kept": VerificationStatus.FULFILLED,
    "fulfilled": VerificationStatus.FULFILLED,
    "in_progress": VerificationStatus.IN_PROGRESS,
    "compromise": VerificationStatus.COMPROMISE,
    "broken": VerificationStatus.BROKEN,
    "no_action": VerificationStatus.NO_ACTION,
}


def _clamp_confidence(value: object) -> float:
    """Clamp the dataset confidence into [0, 1]."""
    try:
        return max(0.0, min(1.0, float(value)))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0


def _map_status(raw: object) -> VerificationStatus:
    """Map a dataset status string onto the enum (default NO_ACTION)."""
    if isinstance(raw, str):
        return STATUS_MAP.get(raw.strip().lower(), VerificationStatus.NO_ACTION)
    return VerificationStatus.NO_ACTION


async def main() -> None:
    with open(JSON_PATH, encoding="utf-8") as fh:
        raw = json.load(fh)
    if not isinstance(raw, list):
        raise SystemExit(f"{JSON_PATH} must contain a JSON array of promises.")

    # Keep only real promises (those with a title). Some datasets — e.g. a
    # government minister with no presidential platform — ship a single
    # explanatory "note" record with no title; that yields zero promises, which
    # the site renders as an empty state.
    entries = [e for e in raw if isinstance(e, dict) and e.get("title")]
    skipped = len(raw) - len(entries)
    if skipped:
        print(f"Skipped {skipped} non-promise note record(s).")

    # Ensure tables exist (no-op if the API already created them).
    await init_db()

    incoming_slugs = {slug_of(e) for e in entries if slug_of(e)}
    now = datetime.datetime.now(datetime.timezone.utc)

    async with SessionLocal() as session:
        # 1. Resolve the target politician by slug (get-or-create, idempotent).
        politician = await get_or_create_politician(session)
        print(f"Target politician: {politician.name} ({politician.id})")

        # 2. Index existing promises (for THIS politician) and prune any not in
        #    the incoming dataset. Scoped by politician_id — never touches others.
        existing = list(
            (
                await session.execute(
                    select(Promise).where(Promise.politician_id == politician.id)
                )
            )
            .scalars()
            .all()
        )
        existing_by_slug = {p.external_id: p for p in existing if p.external_id}

        pruned = 0
        for promise in existing:
            if promise.external_id not in incoming_slugs:
                await session.delete(promise)  # cascades to its verifications
                pruned += 1
        await session.flush()

        # 3. Upsert each incoming promise + its verification.
        created = updated = 0
        status_counts: dict[VerificationStatus, int] = {
            s: 0 for s in VerificationStatus
        }
        for entry in entries:
            slug = slug_of(entry)
            promise = existing_by_slug.get(slug)
            if promise is None:
                promise = Promise(politician_id=politician.id, external_id=slug)
                session.add(promise)
                created += 1
            else:
                updated += 1

            sources = _as_list(entry.get("source_url"))
            promise.title = entry["title"]
            promise.description = entry.get("description")
            promise.date_made = _parse_date(entry.get("date_made"))
            promise.category = entry.get("category")
            # Keep the single source_url populated with the primary source.
            promise.source_url = sources[0] if sources else None
            await session.flush()

            # Replace any existing verification(s) for this promise.
            await session.execute(
                delete(Verification).where(Verification.promise_id == promise.id)
            )
            status = _map_status(entry.get("status"))
            status_counts[status] += 1
            session.add(
                Verification(
                    promise_id=promise.id,
                    status=status,
                    confidence_score=_clamp_confidence(entry.get("confidence_score")),
                    reasoning=entry.get("reasoning"),
                    key_evidence=_as_list(entry.get("key_evidence")),
                    source_urls=sources,
                    human_review_status=HumanReviewStatus.APPROVED,
                    verified_date=now,
                )
            )

        await session.commit()

    # 4. Report.
    print(
        f"\nImported {len(entries)} promises "
        f"({created} created, {updated} updated, {pruned} pruned)."
    )
    print("Status distribution:")
    for status, count in status_counts.items():
        if count:
            print(f"  {status.value:<12} {count}")


if __name__ == "__main__":
    asyncio.run(main())
