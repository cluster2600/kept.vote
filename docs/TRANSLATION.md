# Translation

The site has two separate bodies of text, translated in different ways.

| | Where | How | Reviewed |
| --- | --- | --- | --- |
| **UI** — labels, headings, badges | `frontend/app/[lang]/dictionaries/*.json` | `translate.py --ui`, or by hand | should be |
| **Profile text** — bios, promises, verdicts | `data/*.json` → `translations/*.json` | `translate.py` | no, and the page says so |

The 26 UI locales are the 24 official EU languages plus Norwegian Bokmål and
Romansh (`frontend/lib/i18n/config.ts`). A missing UI key falls back to
English at runtime, so a partly translated locale renders correctly — it just
renders some English. `npm run check:i18n` reports the gaps.

## What gets translated, and what must not

`translate.py`'s `TRANSLATABLE` map lists the fields that are translated, per
profile section. Everything else is never sent to the model, so it cannot be
altered: ids, `source_url`, dates, `confidence_score`, amounts, personal and
party names, and the controlled `status` vocabularies the UI renders as badges.

Two rules protect the sourcing chain:

- **Quoted material stays in its original language.** A quote is evidence. The
  model is instructed to leave anything inside quotation marks verbatim, with
  its quotation marks.
- **Attribution must stay attribution.** "prosecutors allege", "according to
  Le Monde", "as of October 2026" carry legal weight; a translation that turns
  a hedge into an assertion is a factual error, not a style problem. The
  system prompt says so explicitly, and this is the first thing to check when
  reviewing a sample.

## Disclosure

Machine-translated text is labelled wherever it appears:

- the politician page shows "Machine-translated from <language>" in place of
  the usual "Profile written in <language>" badge, plus a sentence saying the
  translation is unreviewed and pointing at the sources;
- the promise page — the most consequential text on the site — repeats the
  notice above the verdict;
- the home page carries a one-line notice, because it shows profile text too.

The `lang` attribute follows the text: translated text is tagged with the UI
locale, untranslated text keeps `content_lang`.

## Translation memory

`translations/<lang>.json` maps a 16-hex-character hash of the source string
to its translation. Consequences worth knowing:

- A string is translated **once, ever**. Editing one promise re-translates
  that promise, not the corpus.
- The same sentence in two profiles is translated once and reused.
- Builds need no API key: `build_d1.py` only reads the memory.
- Changing a source string orphans its entry. `translate.py --lang X --prune`
  removes entries no longer present in `data/`.
- The memory is committed, so translations are reviewable in a diff and
  reproducible in CI.

`build_d1.py` applies the memory by walking the rendered JSON and replacing
any string value it has a translation for. Because only allowlisted fields
ever entered the memory, nothing else can be touched.

## Cost and storage

Measured against the 111 profiles in `data/` as of October 2026:

| | Value |
| --- | --- |
| distinct translatable strings | ~19,700 |
| characters | ~2.8 M |
| tokens per language | ~800 k in, ~800 k out |
| 25 target languages | ~20 M in, ~20 M out |
| `seed.sql`, source only | ~9 MB |
| `seed.sql`, + 1 locale | ~18 MB |

Run `python translate.py --report` for current numbers.

Two things follow from the table:

1. **Translate with a cheap model.** `--model` defaults to
   `claude-haiku-5-5`. Spot-check a sample with a stronger model rather than
   translating everything with one.
2. **Locales are opt-in per build.** Each locale adds roughly the size of the
   source corpus to `seed.sql`, because a translated document is stored whole.
   At 111 profiles, all 26 locales is ~240 MB — fine. **At the 200-per-country
   target (~5,600 profiles) it is well past D1's 10 GB limit**, so that growth
   needs a different storage shape before it arrives: store the translation
   memory in D1 and substitute in the Worker, which stores each translated
   *string* once instead of each translated *document*. Until then, publish
   the locales that matter most (`build_d1.py --lang de --lang fr …`); the rest
   fall back to the source text, correctly and without a disclaimer.

## Reviewing a locale

Machine output is a starting point. For any locale you intend to promote:

1. `python translate.py --lang X --limit 200` — a sample, not the corpus.
2. Read the promise verdicts first: `status`, `reasoning` and `key_evidence`
   are where a mistranslation does real damage.
3. Check that quotes are still in their original language.
4. Check that hedging and attribution survived.
5. Fix by editing `translations/X.json` directly — hand edits are preserved,
   because only missing keys are ever translated.
