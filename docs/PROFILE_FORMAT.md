# Politician profile format

How to add a politician to kept.vote. Every profile is a set of JSON files in
[`data/`](../data), checked by [`validate_profile.py`](../validate_profile.py)
and loaded by the importers. `data/sebastien-lecornu_*` is a reference profile
that passes strict validation.

## Workflow

1. Pick the slug: the person's usual name, ASCII, lowercase, hyphenated
   (`ursula-von-der-leyen`, `petr-fiala`). Diacritics are dropped in the slug
    only, never in the data.
2. Research and write the files below. Record the research date in your commit
   message: profiles describe the situation **as of that date**.
3. Validate. New profiles must pass strict mode:

   ```bash
   python validate_profile.py --strict <slug>
   ```

4. Import locally and check the page renders:

   ```bash
   DATA_PREFIX=<slug> POLITICIAN_SLUG=<slug> BIO_JSON=data/<slug>_bio.json python import_promises.py
   DATA_PREFIX=<slug> POLITICIAN_SLUG=<slug> BIO_JSON=data/<slug>_bio.json python import_profile.py
   ```

5. Commit one politician per commit.

## Files

| File | Required | Content |
| --- | --- | --- |
| `<slug>_bio.json` | yes | one object, see below |
| `<slug>_promises.json` | yes | public commitments with a verdict |
| `<slug>_polemics.json` | yes | public controversies (can be `[]`) |
| `<slug>_justice.json` | yes | legal proceedings (can be `[]`) |
| `<slug>_work_history.json` | yes | career, including current office |
| `<slug>_education.json` | yes | degrees and schools |
| `<slug>_electoral_history.json` | yes | elections stood in |
| `<slug>_key_legislation.json` | yes | laws and policies they drove |
| `<slug>_honors.json` | no | decorations and awards |
| `<slug>_companies.json` | no | company roles and holdings |
| `<slug>_interests.json` | no | declared interests and affiliations |
| `<slug>_finances.json` | no | declared income and assets |
| `<slug>_net_worth_timeline.json` | no | declared net worth over time |
| `<slug>_real_estate.json` | no | declared property |
| `<slug>_stocks_portfolio.json` | no | declared securities |

**Financial sections are only written when the country publishes official
declarations** (France: HATVP; the European Parliament's declarations of
financial interests; national registers where they exist). Don't fill them
from press estimates, and don't add placeholder "none declared" records for a
country with no declaration regime: leave the file out. `companies` and
`interests` can be filled from official registers (company registries,
parliamentary registers of interests) where those are public.

## Bio

```json
{
  "name": "Jana Nováková",
  "country": "Czechia",
  "country_code": "CZ",
  "office": "head_of_government",
  "role": "Prime Minister of the Czech Republic (předsedkyně vlády)",
  "content_lang": "en",
  "party": "Example Party (XP) — Renew Europe",
  "birth_date": "1970-01-31",
  "bio": "Three to six sentences: who they are, current office and since when, party, path to power, defining record."
}
```

- `country`: English short name. `country_code`: ISO 3166-1 alpha-2 (`GR` for
  Greece, not `EL`). Covered: the 27 EU member states, `CH`, `NO`.
- `office`: one of `head_of_state`, `head_of_government`, `minister`,
  `legislator`, `mayor`, `regional_executive`, `party_leader`, `other`. The UI
  translates this; `role` carries the exact title.
- `content_lang`: the language every text field is written in. **New profiles
  are written in English** (`en`), keeping native names and official titles in
  the original language where useful (e.g. "Federal Chancellor
  (Bundeskanzler)"). The UI is translated, profile text is not.
- `party`: native name with abbreviation, then the European Parliament group.
- `birth_date`: `YYYY-MM-DD`.

## Sections

Every record has an `id` (unique within its file, stable across edits: the
importer upserts by it) and `source_url` (a list of one or more URLs). Use only
the field names below; the importer accepts some older spellings, but new data
must not add more.

| Section | Fields (required in bold) |
| --- | --- |
| promises | **title**, description, **date_made**, category, **status**, **confidence_score**, **reasoning**, key_evidence[] |
| polemics | **title**, period, category, **description**, **status**, confidence_score, key_facts[] |
| justice | **case**, period, type, **description**, **status**, outcome, **court**, **presumption_note**, key_facts[] |
| work_history | **role**, **organization**, **start_date**, end_date, description, category |
| education | **institution**, qualification, field, years, detail |
| electoral_history | **election**, **date**, role_sought, **result**, vote_share, opponent, detail |
| key_legislation | **law_name**, **year**, area, **description**, significance |
| honors | **honor**, awarded_by, year, detail |
| companies | **entity**, **role**, ownership_stake, period, status, detail |
| interests | **item**, type, period, value, detail, status |
| finances | **year**, **type**, **label**, amount, detail |
| net_worth_timeline | **year**, **declared_net_worth**, note, status |
| real_estate | **property**, location, transaction_type, date, value, detail, status |
| stocks_portfolio | **holding**, type, value, as_of, detail, status |

Controlled values (the UI renders these as badges):

- promises `status`: `kept`, `in_progress`, `compromise`, `broken`,
  `no_action`.
- polemics `status`: `no_charges`, `ongoing`, `resolved`, `judicial`,
  `political`.
- justice `status`: `ongoing`, `appeal_pending`, `convicted`, `acquitted`,
  `dismissed`, `no_charges`, `settled`, `other`.
- real_estate / stocks_portfolio / net_worth_timeline `status`: `declared`,
  `estimated`, `historical`, `divested`, `none`.
- `confidence_score`: a number from 0 to 1 (not a word).
- Dates: `YYYY-MM-DD`, or `YYYY-MM` / `YYYY` when that's all that's known.
  `end_date: null` means "current".

## Promises

A promise is a specific, public, attributable commitment: a manifesto or
coalition-agreement pledge, a government programme item, or an on-the-record
statement ("we will…"). Vague aspirations are not promises. Prefer 6–12 of the
most significant ones, across policy areas.

- `status` is the verdict on the research date: `kept` (done as promised),
  `compromise` (done in a weakened or altered form), `in_progress` (concrete
  steps taken, not finished), `broken` (abandoned, reversed, or impossible
  within the term), `no_action` (nothing done yet).
- `reasoning` explains the verdict in two to four sentences grounded in the
  evidence; `key_evidence` lists the concrete facts.
- `confidence_score` reflects how strong and unambiguous the evidence is
  (0.9+: official record settles it; 0.6–0.8: solid reporting, some
  interpretation; below 0.5: say why in `reasoning`).
- `source_url` must include the source of the promise itself and the evidence
  for the verdict.

## Editorial rules

These apply to every section, and strictly to polemics and justice:

- **Every record is sourced.** Prefer primary and official sources (government,
  parliament, courts, official registers, election commissions), then
  established news organisations, then Wikipedia as a pointer only. A claim
  that only one partisan outlet reports doesn't go in.
- **Neutral wording.** Report what happened and who said what; no adjectives
  that judge. Allegations are attributed ("prosecutors allege", "according to
  Le Monde") and never stated as fact.
- **Justice is about this person.** The justice section lists only proceedings
  where the politician is a party (suspect, defendant, complainant, plaintiff)
  or a formally summoned witness, so a "Convicted" badge on their page always
  means *they* were convicted. Proceedings against relatives, aides or party
  colleagues go in polemics (status `judicial`), saying how they relate to the
  politician and that the politician is not a party.
- **Presumption of innocence.** Every justice record has a `presumption_note`
  and states the procedural stage precisely (investigation, charge, trial,
  first-instance verdict, appeal, final). Update or close records when the
  outcome changes; an acquittal or dismissal must be recorded as such.
- **Public role only.** No private-life details unless they are themselves a
  matter of documented public controversy. Never include relatives who are not
  public figures, health information, addresses or other personal data.
- **Date-stamped.** State things as of the research date ("as of October
  2026"), so stale facts are visibly stale.
