# Swiss public-records corpus

Research snapshot started **22 October 2026** for kept.vote. This is a working
corpus, not an assertion that every Swiss politician has been investigated.
Public parliamentary activity, declared affiliations and judicial outcomes
are separate datasets. An affiliation is not evidence of wrongdoing.

## Files

| File | Content | Scope |
| --- | --- | --- |
| `persons.jsonl` | Names, source IDs, public roles, party and parliament links | All endpoint records, including historical people and repeated identities across jurisdictions; see Swiss scope below |
| `bodies.jsonl` | Federal, cantonal and municipal institutional directory | Includes unindexed bodies and foreign reference entries; a directory entry does not prove person/activity coverage |
| `interests.jsonl` | Declared organizations, roles, payment categories and source links | All returned interest records; a missing declaration is not proof of no interests |
| `affairs.jsonl` | Parliamentary business titles, dates, states and source links | Capped at 2,000 most recently updated records; may include future scheduled business |
| `coverage.json` | Country breakdowns, active flags and join gaps | Derived snapshot audit; regenerate after recollection |
| `manifest.json` | Request URLs, retrieval times, response hashes, record totals, file hashes | `complete_endpoint` describes that endpoint only, not nationwide completeness |
| `federal_executive.json` | Seven Federal Councillors and the Federal Chancellor | Official government page checked on 22 October 2026 |
| `case_reviews.json` | Ten selected judicial/procedural research briefs | Deliberately small, nonrepresentative initial selection; publication drafts |
| `source_catalog.json` | Collected sources and next sources to acquire | `collected: false` means discovery only |

The upstream directory includes foreign country reference entries, and the persons
endpoint includes **135 Liechtenstein records** alongside **26,830 Swiss records**
in this snapshot (26,965 total). Use `bodies.country_key == "CHE"` and join through
`body_id` to restrict analysis to Switzerland; do not label every upstream row Swiss.
The affairs sample also includes six Liechtenstein records (1,994 Swiss). All
30,389 interest records join to Swiss bodies and known person records.
There are 2,163 Swiss body entries, only 96 marked indexed by the source. That is
not evidence of complete coverage of 2,163 parliaments.

JSONL contains one JSON object per line. Join interests to persons by `person_id`
and to bodies by `body_id`; person IDs are source-record identities, not a
cross-jurisdiction deduplication guarantee. Names alone are insufficient for
merging people. Individual API URLs and original parliament URLs remain available.
Do not infer that an `active` flag means a person currently holds every past role.

## Recollect and check

From the repository root, using Python 3.10+ and curl (no API keys or paid services):

```sh
python3 scripts/collect_swiss_corpus.py
python3 -m unittest discover -s tests -v
```

The collector orders pages deterministically, rejects duplicate IDs and changing
reported totals, verifies TLS through curl, and replaces each dataset only after
its collection succeeds. It stores retrieval receipts and hashes. The upstream
API is live: equal totals cannot guarantee unchanged rows during pagination;
this is not a transactionally frozen upstream snapshot. Each endpoint has its own
collection time. A failure can leave earlier endpoints refreshed; inspect the
manifest before combining snapshots. Successful recollection replaces that file;
use Git history to retain previous snapshots.

Person records are allowlisted to exclude emails, phones, street addresses and
birth dates. No private-account data, leaked documents or secret access is used.
No article bodies or full judicial decisions are republished. Public API
availability is not a blanket republication licence; source terms and the
specific fields intended for publication still require review.

## Judicial interpretation

Each brief preserves the source's procedural date and the date it was consulted.
`current_status_verified: false` means later rulings/finality still need checking;
consultation today does not make an old procedural status current.

- A conviction must be tied to a named public decision, offence, date and appeal/finality status.
- Investigations, accusations and immunity decisions do not establish guilt.
- Discontinuance, acquittal and reparation-based closure are distinct outcomes.
- A political controversy or lawful declared mandate belongs outside criminal findings.
- Immunity retained does not certify that conduct was lawful.
- A case about an association or another person must not become an accusation against its political beneficiary.
- No case found means **not systematically reviewed**, never “clean record.”

The initial briefs cover Maudet, Barazzone, Geneva executive expenses, Glarner,
Blocher, Hainard, Zuppiger and Stocker. They include exculpatory outcomes and differentiated
roles. They are selected examples, not a party comparison or misconduct ranking.
The Hainard historical PDF currently redirects to a general page: its indexed
excerpt is a research lead and requires a retrievable primary copy. Some other
briefs rely on public-service reporting pending the original decision.

## Before website import

The existing application consumes `data/<slug>_<section>.json`, not this directory.
This change adds no automatic publication or database writes. The current
`import_profile.py` prunes section rows absent from an incoming dataset: do not
feed an incomplete research subset into it.

For each proposed publication, resolve identity against the source parliament,
review the underlying evidence and any later disposition, retain exculpatory facts,
write neutral source-attributed text, then explicitly map approved records to the
existing bio / interests / key legislation / justice / polemics sections. Keep
judicial status and the review date visible. Claims about identifiable people
need an evidence check before publication; do not add inferred wealth, hidden
mandates, criminality labels or numerical guilt/confidence scores.

## Remaining investigation

1. Reconcile current federal members and executive holders against official rosters, then each of the 26 cantons and indexed municipalities. Audit executive gaps separately from parliamentary coverage.
2. Fetch complete memberships, individual legislative sponsorship/contributors and voting records to attribute actions to people. An affair listing alone does not show who proposed or supported it.
3. Acquire official public funding declarations and public-interest mandates, preserving periods, amounts and source-specific reporting coverage.
4. Review politicians systematically using French, German and Italian searches of official courts/prosecutors and reputable reporting; record search terms, dates, jurisdiction, subject role, and negative/inconclusive results. Do not identify anonymized litigants by inference.
5. Obtain missing original decisions and later outcomes for the ten initial briefs; add documented responses, corrections and publication review before website use.

## Judges and relationship map

See [judges, contributions and map data](JUDGES_AND_NETWORK.md) for the additional
official judicial rosters, published party affiliations, historical party tariffs
and source-attributed network exports. See [three judicial profiles](JUDICIAL_PROFILES.md)
for the 2023 sentencing controversy and seven verified named party declarations,
and [national comparative evidence](NATIONAL_COMPARISON.md) for the recovered
BFS series and the limits on judge comparisons. These remain research drafts.

The additional [judicial interest-register source catalog](judicial_interest_register_sources.json)
archives 15 official declaration PDFs from partial coverage of four cantons.
Individual identities and roles have not yet been imported into the map.
