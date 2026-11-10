#!/usr/bin/env python3
"""Translate profile text into the site's UI locales.

The site's UI has always been translated (``frontend/app/[lang]/dictionaries``);
profile text was not — it is written in ``content_lang`` and served as-is. This
script adds a *labelled machine translation* layer over it, so a reader in any
supported locale sees the content in their language while the sourcing chain
stays intact:

- Only the text fields listed in :data:`TRANSLATABLE` are translated. Names,
  dates, URLs, numbers, ids, slugs and the controlled status values are never
  sent to the model and never change.
- **Quoted material is kept verbatim.** Anything inside quotation marks is a
  quote from a source, so it is preserved in its original language; the UI
  shows it as such and offers the untranslated original of every field.
- Translations are machine output, not edited copy. ``build_d1.py`` marks every
  translated document so the page can say so.

Translations live in a *translation memory*: ``translations/<lang>.json``, keyed
by a hash of the source string. A string is translated once, ever — editing one
promise re-translates that promise, not the corpus. The memory is committed, so
a build never needs an API key and CI is reproducible.

Usage::

    python translate.py --report                 # what a run would cost
    python translate.py --lang de                # fill in German
    python translate.py --lang de --limit 50     # a small first batch
    python translate.py                          # every locale (expensive)
    python translate.py --lang de --prune        # drop orphaned entries

Requires ``ANTHROPIC_API_KEY``. ``--report`` and ``--prune`` do not.
"""

from __future__ import annotations

import argparse
import asyncio
import glob
import hashlib
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MEMORY_DIR = ROOT / "translations"

# Locales the site serves, and the language names to instruct the model with.
# Mirrors LOCALES in frontend/lib/i18n/config.ts: the 24 official EU languages
# plus Norwegian Bokmål and Romansh. Keep the two lists in step.
LANGUAGE_NAMES = {
    "bg": "Bulgarian",
    "cs": "Czech",
    "da": "Danish",
    "de": "German",
    "el": "Greek",
    "en": "English",
    "es": "Spanish",
    "et": "Estonian",
    "fi": "Finnish",
    "fr": "French",
    "ga": "Irish",
    "hr": "Croatian",
    "hu": "Hungarian",
    "it": "Italian",
    "lt": "Lithuanian",
    "lv": "Latvian",
    "mt": "Maltese",
    "nb": "Norwegian Bokmål",
    "nl": "Dutch",
    "pl": "Polish",
    "pt": "European Portuguese",
    "ro": "Romanian",
    "rm": "Romansh (Rumantsch Grischun)",
    "sk": "Slovak",
    "sl": "Slovenian",
    "sv": "Swedish",
}

# Text fields worth translating, per profile section (docs/PROFILE_FORMAT.md).
# Everything absent here — ids, dates, amounts, source_url, confidence_score,
# the controlled `status` vocabularies, and personal and party names — is left
# exactly as written.
TRANSLATABLE = {
    "bio": {"bio", "role"},
    "promises": {"title", "description", "category", "reasoning", "key_evidence"},
    "polemics": {"title", "category", "description", "key_facts"},
    "justice": {
        "case",
        "type",
        "description",
        "outcome",
        "court",
        "presumption_note",
        "key_facts",
    },
    "work_history": {"role", "organization", "description", "category"},
    "education": {"institution", "qualification", "field", "detail"},
    "electoral_history": {"election", "role_sought", "result", "opponent", "detail"},
    "key_legislation": {"law_name", "area", "description", "significance"},
    "honors": {"honor", "awarded_by", "detail"},
    "companies": {"entity", "role", "detail"},
    "interests": {"item", "type", "detail"},
    "finances": {"type", "label", "detail"},
    "net_worth_timeline": {"note"},
    "real_estate": {"property", "location", "transaction_type", "detail"},
    "stocks_portfolio": {"holding", "type", "detail"},
}

# Sections ordered longest-first so "net_worth_timeline" wins over a shorter
# suffix that happens to also match.
_SECTIONS_BY_LENGTH = sorted(TRANSLATABLE, key=len, reverse=True)

# A string with no letters (a bare year, an amount, "—") has nothing to
# translate; sending it only invites the model to "improve" it.
_HAS_LETTERS = re.compile(r"[^\W\d_]", re.UNICODE)


def section_of(filename: str) -> str | None:
    """Return the profile section a ``data/`` filename belongs to."""
    base = os.path.basename(filename)
    if not base.endswith(".json"):
        return None
    stem = base[: -len(".json")]
    for section in _SECTIONS_BY_LENGTH:
        if stem.endswith("_" + section):
            return section
    return None


def fingerprint(text: str) -> str:
    """Stable key for a source string, short enough to keep the memory small."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def translatable_strings() -> dict[str, str]:
    """Every distinct translatable string in ``data/``, keyed by fingerprint."""
    found: dict[str, str] = {}
    for path in sorted(glob.glob(str(ROOT / "data" / "*.json"))):
        section = section_of(path)
        if section is None:
            continue
        fields = TRANSLATABLE[section]
        try:
            doc = json.loads(Path(path).read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            print(f"  ! skipping {os.path.basename(path)}: {exc}", file=sys.stderr)
            continue
        for record in doc if isinstance(doc, list) else [doc]:
            if not isinstance(record, dict):
                continue
            for key, value in record.items():
                if key not in fields:
                    continue
                for item in value if isinstance(value, list) else [value]:
                    if not isinstance(item, str):
                        continue
                    text = item.strip()
                    if text and _HAS_LETTERS.search(text):
                        found[fingerprint(text)] = text
    return found


# ---- UI dictionaries ----------------------------------------------------
# The site's chrome (labels, headings, badge names) lives in per-locale JSON
# dictionaries, separate from profile text. English is the source of truth for
# their keys and shape; a missing key falls back to English at runtime
# (frontend/app/[lang]/dictionaries.ts), so a partly translated locale renders
# correctly — it just renders some English.
DICT_DIR = ROOT / "frontend" / "app" / "[lang]" / "dictionaries"

# Plural objects are replaced whole, because a locale's plural categories are
# not English's. The loader expects this, so send the model the whole object.
_PLURAL_CATEGORIES = {"zero", "one", "two", "few", "many", "other"}


def _is_plural_object(value: object) -> bool:
    return (
        isinstance(value, dict)
        and "other" in value
        and all(k in _PLURAL_CATEGORIES for k in value)
    )


def flatten_dict(node: object, prefix: str = "") -> dict[str, object]:
    """Flatten a dictionary file to ``dotted.key -> str | plural object``."""
    out: dict[str, object] = {}
    if isinstance(node, dict):
        if _is_plural_object(node):
            return {prefix: node}
        for key, value in node.items():
            out.update(flatten_dict(value, f"{prefix}.{key}" if prefix else key))
    elif isinstance(node, str):
        out[prefix] = node
    return out


def _set_path(target: dict, dotted: str, value: object) -> None:
    keys = dotted.split(".")
    for key in keys[:-1]:
        target = target.setdefault(key, {})
    target[keys[-1]] = value


DICT_SYSTEM_PROMPT = """\
You translate the user interface of kept.vote, a political accountability site \
that tracks whether politicians kept their promises, into {language}.

You are given a JSON object mapping keys to English UI strings. Return a JSON \
object with the SAME keys and the strings translated into {language}.

Rules:
1. Return ONLY the JSON object, with exactly the keys you were given.
2. These are short interface labels: buttons, headings, table columns, badges. \
Keep them short and idiomatic for software in {language}, not literal.
3. Placeholders in braces — {{count}}, {{language}}, {{date}}, {{author}} — \
must appear unchanged in the translation. Do not translate or rename them.
4. A value that is an object of plural forms (keys among zero/one/two/few/many/\
other) must be returned as an object with the plural categories {language} \
actually uses, each a full translated string.
5. Keep the register neutral and factual. "broken promise", "convicted", \
"alleged" are legal and editorial terms: translate them precisely, never more \
or less strongly than the English.
6. Preserve any leading or trailing spaces, punctuation and capitalisation style.
"""


async def translate_dictionary(lang: str, *, model: str) -> int:
    """Fill in a locale's missing UI dictionary keys. Returns the count added."""
    from anthropic import AsyncAnthropic

    english = json.loads((DICT_DIR / "en.json").read_text(encoding="utf-8"))
    target_path = DICT_DIR / f"{lang}.json"
    existing = (
        json.loads(target_path.read_text(encoding="utf-8"))
        if target_path.exists()
        else {}
    )

    source_flat = flatten_dict(english)
    have = {k for k, v in flatten_dict(existing).items() if v}
    missing = {k: v for k, v in source_flat.items() if k not in have}
    if not missing:
        print(f"{lang}: UI dictionary already complete")
        return 0

    client = AsyncAnthropic()
    message = await client.messages.create(
        model=model,
        max_tokens=16000,
        system=DICT_SYSTEM_PROMPT.format(language=LANGUAGE_NAMES[lang]),
        messages=[{"role": "user", "content": json.dumps(missing, ensure_ascii=False)}],
    )
    text = "".join(b.text for b in message.content if b.type == "text").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n|\n```$", "", text)
    try:
        translated = json.loads(text)
    except json.JSONDecodeError:
        print(f"  ! {lang}: unparseable UI reply", file=sys.stderr)
        return 0
    if not isinstance(translated, dict):
        print(f"  ! {lang}: UI reply was not an object", file=sys.stderr)
        return 0

    added = 0
    for key, value in translated.items():
        if key not in missing:
            continue  # ignore anything we did not ask for
        if _is_plural_object(source_flat[key]):
            if _is_plural_object(value):
                _set_path(existing, key, value)
                added += 1
        elif isinstance(value, str) and value.strip():
            _set_path(existing, key, value)
            added += 1

    target_path.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{lang}: {added} of {len(missing)} missing UI keys translated")
    return added


def memory_path(lang: str) -> Path:
    return MEMORY_DIR / f"{lang}.json"


def load_memory(lang: str) -> dict[str, str]:
    path = memory_path(lang)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{path} is not valid JSON: {exc}") from exc


def save_memory(lang: str, memory: dict[str, str]) -> None:
    MEMORY_DIR.mkdir(exist_ok=True)
    # Sorted keys and a trailing newline keep diffs small and reviewable.
    memory_path(lang).write_text(
        json.dumps(memory, ensure_ascii=False, indent=0, sort_keys=True) + "\n",
        encoding="utf-8",
    )


SYSTEM_PROMPT = """\
You translate text for kept.vote, a political accountability site that tracks \
whether politicians kept their promises. You are given a JSON array of source \
strings and must return a JSON array of translations into {language}.

Rules:
1. Return ONLY a JSON array of strings, the same length and order as the input.
2. Translate into {language}. Use the neutral, factual register of a reference \
work. Never add, remove, soften or strengthen a claim — these are sourced \
statements about real people and the wording carries legal weight.
3. Keep anything inside quotation marks in its ORIGINAL language, with its \
quotation marks. Quotes are evidence from sources and must stay verbatim.
4. Do not translate: personal names, party names and their abbreviations, \
institution and company names, place names that have no established {language} \
form, law and case titles, currency amounts, dates and numbers.
5. Where an institution or office has an established {language} name, use it \
and keep the original in parentheses on first mention if the source did.
6. Preserve the exact meaning of hedging and attribution ("prosecutors allege", \
"according to Le Monde", "as of October 2026"). Attribution must never become \
an assertion.
7. Preserve leading and trailing whitespace, capitalisation style and any \
markdown or punctuation structure.
"""


def _batches(items: list[tuple[str, str]], max_chars: int) -> list[list[tuple[str, str]]]:
    """Group (key, text) pairs into request-sized batches."""
    batches: list[list[tuple[str, str]]] = []
    current: list[tuple[str, str]] = []
    size = 0
    for key, text in items:
        # A single string longer than the budget still goes out on its own.
        if current and size + len(text) > max_chars:
            batches.append(current)
            current, size = [], 0
        current.append((key, text))
        size += len(text)
    if current:
        batches.append(current)
    return batches


async def translate_language(
    lang: str,
    pending: list[tuple[str, str]],
    *,
    model: str,
    concurrency: int,
    max_chars: int,
    memory: dict[str, str],
) -> dict[str, str]:
    """Translate ``pending`` into ``lang``, filling ``memory`` as batches land.

    ``memory`` is updated and written to disk after every batch, so a run that
    is interrupted or rate-limited halfway keeps the strings it paid for. A
    corpus this size takes many minutes per language; losing it all to a
    dropped connection is not acceptable.
    """
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic()
    system = SYSTEM_PROMPT.format(language=LANGUAGE_NAMES[lang])
    batches = _batches(pending, max_chars)
    done: dict[str, str] = {}
    semaphore = asyncio.Semaphore(concurrency)
    completed = 0

    async def run(batch: list[tuple[str, str]]) -> dict[str, str]:
        nonlocal completed
        sources = [text for _, text in batch]
        async with semaphore:
            message = await client.messages.create(
                model=model,
                max_tokens=32000,
                system=system,
                messages=[
                    {"role": "user", "content": json.dumps(sources, ensure_ascii=False)}
                ],
            )
        text = "".join(
            block.text for block in message.content if block.type == "text"
        ).strip()
        # The model occasionally wraps the array in a fenced code block.
        if text.startswith("```"):
            text = re.sub(r"^```[a-z]*\n|\n```$", "", text)
        try:
            translated = json.loads(text)
        except json.JSONDecodeError:
            print(f"  ! {lang}: unparseable reply for {len(batch)} strings", file=sys.stderr)
            return {}
        if not isinstance(translated, list) or len(translated) != len(batch):
            print(
                f"  ! {lang}: expected {len(batch)} translations, got "
                f"{len(translated) if isinstance(translated, list) else type(translated).__name__}",
                file=sys.stderr,
            )
            return {}
        out = {
            key: value
            for (key, _), value in zip(batch, translated)
            if isinstance(value, str) and value.strip()
        }
        completed += len(out)
        # Persist as we go: see the note in this function's docstring.
        memory.update(out)
        save_memory(lang, memory)
        print(f"  {lang}: {completed}/{len(pending)} strings", flush=True)
        return out

    for result in await asyncio.gather(*(run(b) for b in batches)):
        done.update(result)
    return done


def report(strings: dict[str, str], languages: list[str]) -> None:
    """Print what a full run would translate, without calling the API."""
    total_chars = sum(len(s) for s in strings.values())
    print(f"{len(strings):,} distinct translatable strings, {total_chars:,} characters\n")
    print(f"{'lang':<6}{'missing':>10}{'characters':>14}{'~tokens in':>13}")
    print("-" * 43)
    grand_chars = 0
    for lang in languages:
        memory = load_memory(lang)
        missing = [t for k, t in strings.items() if k not in memory]
        chars = sum(len(t) for t in missing)
        grand_chars += chars
        print(f"{lang:<6}{len(missing):>10,}{chars:>14,}{chars / 3.5:>13,.0f}")
    print("-" * 43)
    print(f"{'all':<6}{'':>10}{grand_chars:>14,}{grand_chars / 3.5:>13,.0f}")
    print(
        "\nOutput tokens run roughly the same again. Translated strings are "
        "stored in translations/<lang>.json and never re-translated."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--lang",
        action="append",
        dest="langs",
        metavar="CODE",
        help="locale to fill in (repeatable); default: every locale but English",
    )
    parser.add_argument(
        "--model",
        default=os.getenv("TRANSLATE_MODEL", "claude-haiku-5-5"),
        help="Claude model for translation (default: claude-haiku-5-5)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="translate at most this many strings per language",
    )
    parser.add_argument(
        "--batch-chars",
        type=int,
        default=12000,
        help="source characters per request (default: 12000)",
    )
    parser.add_argument(
        "--concurrency", type=int, default=4, help="parallel requests (default: 4)"
    )
    parser.add_argument(
        "--report", action="store_true", help="show the work and cost, translate nothing"
    )
    parser.add_argument(
        "--ui",
        action="store_true",
        help=(
            "translate the UI dictionaries' missing keys instead of profile "
            "text (frontend/app/[lang]/dictionaries)"
        ),
    )
    parser.add_argument(
        "--prune",
        action="store_true",
        help="drop memory entries whose source string is gone from data/",
    )
    args = parser.parse_args()

    languages = args.langs or [l for l in LANGUAGE_NAMES if l != "en"]
    unknown = [l for l in languages if l not in LANGUAGE_NAMES]
    if unknown:
        parser.error(f"unknown locale(s): {', '.join(unknown)}")

    if args.ui:
        if not os.getenv("ANTHROPIC_API_KEY"):
            print("ANTHROPIC_API_KEY is not set.", file=sys.stderr)
            return 1
        total = 0
        for lang in languages:
            total += asyncio.run(translate_dictionary(lang, model=args.model))
        print(f"\n{total} UI keys translated. Verify with: npm run check:i18n")
        return 0

    print("Scanning data/ …")
    strings = translatable_strings()
    if not strings:
        print("No translatable strings found.", file=sys.stderr)
        return 1

    if args.report:
        report(strings, languages)
        return 0

    if args.prune:
        for lang in languages:
            memory = load_memory(lang)
            kept = {k: v for k, v in memory.items() if k in strings}
            dropped = len(memory) - len(kept)
            if dropped:
                save_memory(lang, kept)
            print(f"{lang}: pruned {dropped} orphaned entries, {len(kept)} kept")
        return 0

    if not os.getenv("ANTHROPIC_API_KEY"):
        print(
            "ANTHROPIC_API_KEY is not set. Use --report to size the job without "
            "an API key.",
            file=sys.stderr,
        )
        return 1

    for lang in languages:
        memory = load_memory(lang)
        pending = [(k, t) for k, t in strings.items() if k not in memory]
        if args.limit:
            pending = pending[: args.limit]
        if not pending:
            print(f"{lang}: already complete ({len(memory)} strings)")
            continue
        print(f"{lang}: translating {len(pending):,} strings with {args.model} …")
        new: dict[str, str] = {}
        try:
            new = asyncio.run(
                translate_language(
                    lang,
                    pending,
                    model=args.model,
                    concurrency=args.concurrency,
                    max_chars=args.batch_chars,
                    memory=memory,
                )
            )
        except KeyboardInterrupt:
            # Completed batches are already on disk (translate_language saves
            # after each one), so the work done so far is not lost.
            print(
                f"\nInterrupted — {len(memory):,} strings saved for {lang}.",
                file=sys.stderr,
            )
            return 130
        print(f"{lang}: {len(new):,} new, {len(memory):,} strings in memory")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
