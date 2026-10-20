#!/usr/bin/env python3
"""Check politician datasets in ``data/`` against the profile format.

Usage::

    python validate_profile.py                 # report on every profile
    python validate_profile.py guy-parmelin    # one or more slugs
    python validate_profile.py --strict SLUG   # new profiles: problems are errors

Every profile is a ``<slug>_bio.json`` object plus one JSON array per section
(``<slug>_<section>.json``). In strict mode — required for new profiles — the
core sections must exist, records may only use the canonical field names below
(the importer still accepts older spellings, but new data must not add more),
and every record must carry at least one source URL (https preferred).

Exit status is 1 if any error was found.
"""

from __future__ import annotations

import argparse
import datetime
import glob
import json
import os
import re
import sys

from profile_format import CORE_SECTIONS, OFFICES, parse_confidence

DATA_DIR = os.getenv("DATA_DIR", "data")

# Countries the site covers: the 27 EU member states, Switzerland and Norway.
COUNTRY_CODES = {
    "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR",
    "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
    "SE", "SI", "SK", "CH", "NO",
}

# Languages a profile may be written in: the UI locales.
CONTENT_LANGS = {
    "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "ga", "hr",
    "hu", "it", "lt", "lv", "mt", "nl", "pl", "pt", "ro", "sk", "sl", "sv",
    "nb", "rm",
}

BIO_FIELDS = {
    "name", "country", "country_code", "office", "role", "content_lang",
    "party", "birth_date", "bio",
}

# section -> (canonical fields, required fields). ``id`` and ``source_url`` are
# required everywhere and checked separately.
SECTIONS: dict[str, tuple[set[str], set[str]]] = {
    "promises": (
        {"title", "description", "date_made", "category", "status",
         "confidence_score", "reasoning", "key_evidence"},
        {"title", "date_made", "status", "confidence_score", "reasoning"},
    ),
    "polemics": (
        {"title", "period", "category", "description", "status",
         "confidence_score", "key_facts"},
        {"title", "description", "status"},
    ),
    "justice": (
        {"case", "period", "type", "description", "status", "outcome", "court",
         "presumption_note", "key_facts"},
        {"case", "description", "status", "court", "presumption_note"},
    ),
    "work_history": (
        {"role", "organization", "start_date", "end_date", "description",
         "category"},
        {"role", "organization", "start_date"},
    ),
    "education": (
        {"institution", "qualification", "field", "years", "detail"},
        {"institution"},
    ),
    "electoral_history": (
        {"election", "date", "role_sought", "result", "vote_share", "opponent",
         "detail"},
        {"election", "date", "result"},
    ),
    "key_legislation": (
        {"law_name", "year", "area", "description", "significance"},
        {"law_name", "year", "description"},
    ),
    "honors": ({"honor", "awarded_by", "year", "detail"}, {"honor"}),
    "companies": (
        {"entity", "role", "ownership_stake", "period", "status", "detail"},
        {"entity", "role"},
    ),
    "interests": (
        {"item", "type", "period", "value", "detail", "status"},
        {"item"},
    ),
    "finances": (
        {"year", "type", "label", "amount", "detail"},
        {"year", "type", "label"},
    ),
    "net_worth_timeline": (
        {"year", "declared_net_worth", "note", "status"},
        {"year", "declared_net_worth"},
    ),
    "real_estate": (
        {"property", "location", "transaction_type", "date", "value", "detail",
         "status"},
        {"property"},
    ),
    "stocks_portfolio": (
        {"holding", "type", "value", "as_of", "detail", "status"},
        {"holding"},
    ),
}

PROMISE_STATUSES = {"kept", "in_progress", "compromise", "broken", "no_action"}

# Controlled vocabularies (the keys the frontend renders as badges). Older data
# uses free text here; new profiles must use these values.
_ASSET_STATUSES = {"declared", "estimated", "historical", "divested", "none"}
ENUMS: dict[tuple[str, str], set[str]] = {
    ("promises", "status"): PROMISE_STATUSES,
    ("polemics", "status"): {"no_charges", "ongoing", "resolved", "judicial", "political"},
    ("justice", "status"): {
        "ongoing", "appeal_pending", "convicted", "acquitted", "dismissed",
        "no_charges", "settled", "other",
    },
    ("real_estate", "status"): _ASSET_STATUSES,
    ("stocks_portfolio", "status"): _ASSET_STATUSES,
    ("net_worth_timeline", "status"): _ASSET_STATUSES,
}

_PARTIAL_DATE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")


class Report:
    """Collects problems for one profile."""

    def __init__(self, slug: str, strict: bool) -> None:
        self.slug = slug
        self.strict = strict
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def legacy(self, msg: str) -> None:
        """A problem tolerated in existing data but not in new profiles."""
        (self.errors if self.strict else self.warnings).append(msg)


def _sources(value: object) -> list[str]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    return [v for v in value if isinstance(v, str) and v.strip()]


def check_bio(slug: str, report: Report) -> None:
    path = os.path.join(DATA_DIR, f"{slug}_bio.json")
    if not os.path.exists(path):
        report.legacy("missing bio file")
        return
    with open(path, encoding="utf-8") as fh:
        bio = json.load(fh)
    if not isinstance(bio, dict):
        report.error("bio must be a JSON object")
        return
    for field in sorted(BIO_FIELDS - bio.keys()):
        report.legacy(f"bio: missing '{field}'")
    for field in sorted(bio.keys() - BIO_FIELDS - {"slug"}):
        report.legacy(f"bio: unknown field '{field}'")
    if bio.get("country_code") and bio["country_code"] not in COUNTRY_CODES:
        report.error(f"bio: country_code '{bio['country_code']}' not covered")
    if bio.get("office") and bio["office"] not in OFFICES:
        report.error(f"bio: office '{bio['office']}' not in {sorted(OFFICES)}")
    if bio.get("content_lang") and bio["content_lang"] not in CONTENT_LANGS:
        report.error(f"bio: content_lang '{bio['content_lang']}' not a UI locale")
    if bio.get("birth_date"):
        try:
            datetime.date.fromisoformat(bio["birth_date"])
        except (TypeError, ValueError):
            report.legacy(f"bio: birth_date '{bio['birth_date']}' is not YYYY-MM-DD")


def check_section(slug: str, section: str, report: Report) -> None:
    path = os.path.join(DATA_DIR, f"{slug}_{section}.json")
    if not os.path.exists(path):
        if section in CORE_SECTIONS:
            report.legacy(f"{section}: missing file")
        return
    with open(path, encoding="utf-8") as fh:
        records = json.load(fh)
    if not isinstance(records, list):
        report.error(f"{section}: must be a JSON array")
        return
    canonical, required = SECTIONS[section]
    seen: set[str] = set()
    for index, record in enumerate(records):
        where = f"{section}[{index}]"
        if not isinstance(record, dict):
            report.error(f"{where}: not an object")
            continue
        if section == "promises" and set(record) <= {"id", "note", "source_url"}:
            continue  # explanatory note: the importer skips it
        rid = record.get("id")
        if rid is None or not str(rid).strip():
            report.error(f"{where}: missing id")
        elif str(rid) in seen:
            report.error(f"{where}: duplicate id '{rid}'")
        else:
            seen.add(str(rid))
            where = f"{section}[{rid}]"
        for field in sorted(record.keys() - canonical - {"id", "source_url"}):
            report.legacy(f"{where}: non-canonical field '{field}'")
        for field in sorted(required):
            if record.get(field) in (None, "", []):
                report.legacy(f"{where}: missing '{field}'")
        sources = _sources(record.get("source_url"))
        if not sources:
            report.legacy(f"{where}: no source_url")
        for url in sources:
            if url.startswith("http://"):
                # Some official and archive sites are http-only; prefer https.
                report.warnings.append(f"{where}: http (not https) source: {url[:80]}")
            elif not url.startswith("https://"):
                report.error(f"{where}: source is not a URL: {url[:80]}")
        if "confidence_score" in record and record["confidence_score"] is not None:
            if not isinstance(record["confidence_score"], (int, float)):
                if parse_confidence(record["confidence_score"]) is None:
                    report.error(f"{where}: unreadable confidence_score")
                else:
                    report.legacy(f"{where}: confidence_score is not a number")
        for (enum_section, field), allowed in ENUMS.items():
            value = record.get(field)
            if enum_section == section and value and value not in allowed:
                report.legacy(f"{where}: {field} '{str(value)[:40]}' not in {sorted(allowed)}")
        if section == "promises":
            date = record.get("date_made")
            if date and not _PARTIAL_DATE.match(str(date)):
                report.legacy(f"{where}: date_made '{date}' is not YYYY[-MM[-DD]]")


def validate(slug: str, strict: bool) -> Report:
    report = Report(slug, strict)
    check_bio(slug, report)
    for section in SECTIONS:
        check_section(slug, section, report)
    return report


def all_slugs() -> list[str]:
    pattern = os.path.join(DATA_DIR, "*_*.json")
    sections = "|".join(["bio", *SECTIONS])
    slugs = set()
    for path in glob.glob(pattern):
        m = re.match(rf"(.+)_({sections})\.json$", os.path.basename(path))
        if m:
            slugs.add(m.group(1))
    return sorted(slugs)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("slugs", nargs="*", help="profile slugs (default: all)")
    parser.add_argument(
        "--strict", action="store_true", help="treat legacy problems as errors"
    )
    parser.add_argument(
        "--quiet", action="store_true", help="only print profiles with errors"
    )
    args = parser.parse_args()

    slugs = args.slugs or all_slugs()
    failed = 0
    warned = 0
    for slug in slugs:
        report = validate(slug, args.strict)
        if report.errors:
            failed += 1
        if report.warnings:
            warned += 1
        if report.errors or (report.warnings and not args.quiet):
            print(f"{slug}: {len(report.errors)} error(s), {len(report.warnings)} warning(s)")
            for msg in report.errors:
                print(f"  ERROR   {msg}")
            if not args.quiet:
                for msg in report.warnings:
                    print(f"  warning {msg}")
    print(
        f"\n{len(slugs)} profile(s): {failed} with errors, {warned} with warnings."
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
