#!/usr/bin/env python3
"""Seed the API with real, verifiable political promises.

Loads Emmanuel Macron as the first politician along with six well-documented
2017/2022 campaign promises and their curated fact-check verdicts. Talks to the
running API over HTTP using only the standard library, so it has no extra
dependencies and works against any reachable instance.

Usage::

    # with the API running on http://localhost:8000
    python seed.py

    # against a different host, or to wipe-and-reseed Macron
    API_BASE=http://localhost:8000 python seed.py --reset

The script is idempotent: if Emmanuel Macron already exists it exits without
duplicating data (use ``--reset`` to delete and recreate him).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API_BASE = os.getenv("API_BASE", "http://localhost:8000").rstrip("/")

POLITICIAN = {
    "name": "Emmanuel Macron",
    "country": "France",
    "party": "Renaissance",
    "birth_date": "1977-12-21",
    "bio": (
        "President of France since 2017, re-elected in 2022. Founder of the "
        "centrist movement now known as Renaissance."
    ),
}

# Each entry: the promise plus the curated (human) verification verdict.
# Statuses map to the API enum: fulfilled | broken | in_progress | no_action.
PROMISES = [
    {
        "promise": {
            "title": "Raise the legal retirement age to 64",
            "description": (
                "Reform the pension system to progressively raise the minimum "
                "legal retirement age from 62 to 64."
            ),
            "date_made": "2022-03-17",
            "category": "Pensions",
            "source_url": "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000047445077",
        },
        "verification": {
            "status": "fulfilled",
            "confidence_score": 0.96,
            "reasoning": (
                "Enacted as LOI n° 2023-270 of 14 April 2023. The government "
                "used Article 49.3 to pass it without a final Assembly vote, and "
                "the Conseil constitutionnel validated the core provisions. The "
                "legal retirement age rises gradually to 64 by 2030."
            ),
            "key_evidence": [
                "LOI n° 2023-270 du 14 avril 2023 (financement rectificative de la sécurité sociale)",
                "Article 49.3 invoked to pass the bill without a final vote",
                "Conseil constitutionnel decision validating the age increase",
                "Minimum legal age raised 62 -> 64, phased in through 2030",
            ],
        },
    },
    {
        "promise": {
            "title": "Cut the corporate tax rate from 33.3% to 25%",
            "description": (
                "Lower France's headline corporate income tax (impot sur les "
                "societes) from 33.3% to 25% over the five-year term."
            ),
            "date_made": "2017-03-01",
            "category": "Taxation",
            "source_url": "https://www.economie.gouv.fr/cedef/taux-impot-societes",
        },
        "verification": {
            "status": "fulfilled",
            "confidence_score": 0.97,
            "reasoning": (
                "Delivered through a phased reduction across the 2018-2022 "
                "budget laws. The standard corporate tax rate reached 25% for "
                "all companies in 2022, exactly as pledged."
            ),
            "key_evidence": [
                "Loi de finances 2018 began the phased rate reduction",
                "Standard impot sur les societes rate reached 25% in 2022",
                "Applied to all companies regardless of profit level by 2022",
            ],
        },
    },
    {
        "promise": {
            "title": "Ban glyphosate within three years",
            "description": (
                "Phase out and ban the herbicide glyphosate in France within "
                "three years, a pledge made after the 2017 EU re-authorisation."
            ),
            "date_made": "2017-11-27",
            "category": "Environment",
            "source_url": "https://www.vie-publique.fr/en-bref/272124-glyphosate-le-plan-de-sortie-en-question",
        },
        "verification": {
            "status": "broken",
            "confidence_score": 0.90,
            "reasoning": (
                "The three-year deadline (end of 2020/2021) passed without a "
                "ban. Macron himself acknowledged the target would not be fully "
                "met, citing the lack of viable alternatives for some uses. "
                "Glyphosate remained authorised in France beyond the timeframe."
            ),
            "key_evidence": [
                "November 2017 pledge to ban glyphosate within three years",
                "Glyphosate still authorised after the 2020/2021 deadline",
                "Government publicly acknowledged the target was missed",
            ],
        },
    },
    {
        "promise": {
            "title": "Abolish the taxe d'habitation for all households",
            "description": (
                "Eliminate the residence tax (taxe d'habitation) on primary "
                "homes for every household."
            ),
            "date_made": "2017-03-01",
            "category": "Taxation",
            "source_url": "https://www.economie.gouv.fr/particuliers/suppression-taxe-habitation",
        },
        "verification": {
            "status": "fulfilled",
            "confidence_score": 0.90,
            "reasoning": (
                "Phased out for 80% of households by 2020, with the remaining "
                "20% exempted in stages through 2023. As of 2023 the taxe "
                "d'habitation on principal residences is fully abolished. Note: "
                "the tax still applies to second homes, so 'all households' "
                "holds for main residences specifically."
            ),
            "key_evidence": [
                "80% of households exempted by 2020",
                "Remaining households phased out 2021-2023",
                "Fully removed on principal residences from 2023",
                "Caveat: second homes remain subject to taxe d'habitation",
            ],
        },
    },
    {
        "promise": {
            "title": "Cap class sizes at 12 pupils in CP/CE1 in priority zones",
            "description": (
                "Split (dedoublement) the first two primary grades (CP and CE1) "
                "in priority-education areas (REP/REP+) to roughly 12 pupils per "
                "class."
            ),
            "date_made": "2017-03-01",
            "category": "Education",
            "source_url": "https://www.education.gouv.fr/le-dedoublement-des-classes-3120",
        },
        "verification": {
            "status": "fulfilled",
            "confidence_score": 0.85,
            "reasoning": (
                "The dedoublement of CP and CE1 classes in REP and REP+ zones "
                "rolled out from 2017 and was largely completed by 2019-2020, "
                "cutting class sizes to around 12 pupils (realized averages of "
                "roughly 12.5 for CP and 12.8 for CE1) - close to, though not "
                "exactly, the promised cap of 12."
            ),
            "key_evidence": [
                "Dedoublement of CP/CE1 classes in REP/REP+ launched in 2017",
                "Rollout largely completed by the 2019-2020 school year",
                "Average class size brought to ~12 pupils in targeted zones",
            ],
        },
    },
    {
        "promise": {
            "title": "Reach carbon neutrality by 2050",
            "description": (
                "Commit France to net-zero greenhouse gas emissions by 2050."
            ),
            "date_made": "2019-11-08",
            "category": "Environment",
            "source_url": "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000039355955",
        },
        "verification": {
            "status": "in_progress",
            "confidence_score": 0.70,
            "reasoning": (
                "Net-zero by 2050 was enshrined in the 2019 energy-climate law "
                "(Loi energie-climat) and is steered by the Strategie Nationale "
                "Bas-Carbone. It is a long-horizon target: progress is underway "
                "but the goal year is 2050, with interim milestones still being "
                "pursued and gaps flagged by oversight bodies."
            ),
            "key_evidence": [
                "Net-zero by 2050 enshrined in the Loi energie-climat (8 Nov 2019)",
                "Strategie Nationale Bas-Carbone sets the trajectory",
                "Long-term target (2050) - ongoing, not yet achieved",
            ],
        },
    },
    {
        "promise": {
            "title": "Bring the public deficit below 3% of GDP",
            "description": (
                "As a 2017 candidate, Macron pledged fiscal discipline - "
                "restoring France's public finances and getting the annual "
                "budget deficit back under the EU's 3%-of-GDP ceiling by the "
                "end of his term."
            ),
            "date_made": "2017-05-07",
            "category": "Public finances",
            "source_url": "https://www.insee.fr/en/statistiques/8542247",
        },
        "verification": {
            "status": "broken",
            "confidence_score": 0.90,
            "reasoning": (
                "The deficit fell near the target in 2018-2019, but COVID and "
                "the energy crisis reversed it: 4.7% of GDP in 2022, 5.4% in "
                "2023, 5.8% in 2024 and 5.1% in 2025 - still far above the 3% "
                "ceiling for a sixth straight year. Public debt has climbed "
                "from roughly 98% of GDP in 2017 to 115.6% by end-2025. A "
                "return below 3% is now projected only around 2029-2032, well "
                "beyond Macron's term."
            ),
            "key_evidence": [
                "INSEE: in 2024 the public deficit reached 5.8% of GDP and "
                "public debt 113.0% of GDP",
                "Deficit was 5.4% in 2023 and 4.7% in 2022 - all well above "
                "the EU's 3% threshold",
                "Return below 3% now postponed to 2029, beyond the promised "
                "timeframe",
                "Risk flagged: independent warnings (cited by l'Opinion) point "
                "to a possible slippage toward ~6.2% of GDP if no corrective "
                "measures are taken - a projection the public-accounts minister "
                "disputes.",
            ],
        },
    },
]


# ---------------------------------------------------------------------------
# Tiny HTTP helpers (stdlib only)
# ---------------------------------------------------------------------------
def _request(method: str, path: str, body: dict | None = None) -> object:
    """Perform a JSON HTTP request and return the decoded response body."""
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            payload = resp.read()
            return json.loads(payload) if payload else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        raise SystemExit(
            f"HTTP {exc.code} on {method} {path}: {detail}"
        ) from exc
    except urllib.error.URLError as exc:
        raise SystemExit(
            f"Could not reach the API at {API_BASE} ({exc.reason}). "
            "Is the backend running?"
        ) from exc


def get(path: str) -> object:
    return _request("GET", path)


def post(path: str, body: dict) -> object:
    return _request("POST", path, body)


def delete(path: str) -> object:
    return _request("DELETE", path)


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------
def find_existing_macron() -> dict | None:
    """Return the existing Macron summary if present, else ``None``."""
    politicians = get("/api/politicians") or []
    for p in politicians:
        if p["name"] == POLITICIAN["name"]:
            return p
    return None


def main() -> None:
    reset = "--reset" in sys.argv[1:]

    existing = find_existing_macron()
    if existing is not None:
        if not reset:
            print(
                f"'{POLITICIAN['name']}' already exists "
                f"({existing['promise_count']} promises). "
                "Nothing to do. Re-run with --reset to wipe and reseed."
            )
            return
        # The DELETE cascades to promises and verifications.
        print(f"--reset: deleting existing '{POLITICIAN['name']}'...")
        delete(f"/api/politicians/{existing['id']}")

    print(f"Creating politician: {POLITICIAN['name']}")
    politician = post("/api/politicians", POLITICIAN)
    politician_id = politician["id"]

    for entry in PROMISES:
        promise_body = {"politician_id": politician_id, **entry["promise"]}
        promise = post("/api/promises", promise_body)
        verdict = entry["verification"]
        post(
            "/api/verifications",
            {"promise_id": promise["id"], **verdict},
        )
        status_label = verdict["status"].replace("_", " ").upper()
        print(
            f"  + {entry['promise']['title'][:48]:<48} "
            f"[{status_label}, {verdict['confidence_score']:.2f}]"
        )

    print(
        f"\nDone. Seeded {len(PROMISES)} promises for {POLITICIAN['name']}.\n"
        f"Browse the API at {API_BASE}/api/politicians"
    )


if __name__ == "__main__":
    main()
