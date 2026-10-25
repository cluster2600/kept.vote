"""Profile dataset conventions shared by the importers and the validator.

Kept free of database imports so ``validate_profile.py`` runs without the API's
dependencies.
"""

from __future__ import annotations

import unicodedata

# Sections every profile must ship (possibly as an empty array, e.g. no justice
# record). The others are optional: financial sections only exist for countries
# with a public declaration regime.
CORE_SECTIONS = {
    "promises", "polemics", "justice", "work_history", "education",
    "electoral_history", "key_legislation",
}

# Kinds of office a politician can hold. Stored as a key so the frontend can
# translate it; the exact title goes in the free-text ``role``.
OFFICES = {
    "head_of_state",
    "head_of_government",
    "minister",
    "legislator",
    "mayor",
    "regional_executive",
    "party_leader",
    "judge",
    "other",
}


def pick(entry: dict, *keys: str) -> object:
    """Return the first non-empty value among ``keys``.

    Datasets were produced by different research batches that name the same
    field differently (``law_name`` vs ``title``, ``degree`` vs
    ``qualification``...). Field maps list every known spelling, canonical
    first, so no batch silently loses data.
    """
    for key in keys:
        value = entry.get(key)
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        if isinstance(value, list) and not value:
            continue
        return value
    return None


def _fold(text: str) -> str:
    """Lowercase and strip accents, for matching words like "élevé"."""
    decomposed = unicodedata.normalize("NFKD", text.strip().lower())
    return "".join(c for c in decomposed if not unicodedata.combining(c))


# Word-scale confidences used by some batches, matched on the leading words
# (values can carry a justification, e.g. "Moyen (faits rapportés...)").
# Mixed levels come first so "moyen à élevé" isn't read as plain "moyen".
_CONFIDENCE_WORDS = [
    (
        ("moyen a eleve", "moyenne-elevee", "moyen-eleve", "medium-high", "medium to high"),
        0.7,
    ),
    (("tres eleve", "very high"), 0.95),
    (("eleve", "high", "haute", "forte"), 0.85),
    (("moyen", "medium", "moderate"), 0.6),
    (("faible", "low", "basse"), 0.35),
]


def parse_confidence(value: object) -> float | None:
    """Parse a confidence (float, numeric string or word scale) into [0, 1]."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return max(0.0, min(1.0, float(value)))
    if not isinstance(value, str):
        return None
    text = value.strip()
    try:
        number = float(text.rstrip("%"))
    except ValueError:
        pass
    else:
        if text.endswith("%"):
            number /= 100
        return max(0.0, min(1.0, number))
    folded = _fold(text)
    for prefixes, score in _CONFIDENCE_WORDS:
        if folded.startswith(prefixes):
            return score
    return None
