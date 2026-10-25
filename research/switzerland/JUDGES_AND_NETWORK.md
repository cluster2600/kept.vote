# Judges, parties and the relationship map

This addition prepares a **network map**, linking people to organizations,
parties and courts. It does not infer financial influence, judicial bias or
criminal conduct from a relationship. No website/database import is performed.

## Judicial collection

`federal_judges.json` records published rosters of the four civilian federal courts:
Federal Supreme Court (ordinary and deputy judges), Federal Administrative Court,
Federal Criminal Court (ordinary and deputy judges), and Federal Patent Court.
The Military Court of Cassation and cantonal courts are outside this collection.

Each record keeps the court, source role, official profile URL, party label as
published, observation date and explicit missing-payment fields. It does not
republish birth dates, private contact details or full biographies. Presence in a
roster does not independently establish the exact start/end of current tenure.
Names from different courts are not automatically merged.

`judges_manifest.json` preserves the source URLs, retrieval times and response
hashes. Administrative Court data comes from the public list endpoint referenced
in the court's own personnel page markup. Its category 59 identifies judges;
other staff records are discarded. The public introduction says 79 judges while
the list endpoint returns 80 judge-category records: this discrepancy needs roster
reconciliation before calling the result a complete current headcount.
The Supreme Court deputy list contains 18 distinct names and a vacant entry,
with some names repeated in multiple chambers; repeated names are deduplicated.

The Supreme Court party parser reads only an explicit terminal party label in
the biography; other courts use their explicit party fields. German and French labels are retained. Missing values mean
**not published or not extracted**, not unaffiliated. An explicitly published
non-affiliation statement is retained. A published nomination by a party is stored
separately from affiliation; declared party sympathy is also a separate edge type. Party labels may be historical and are not
independent membership attestations.

## Party contributions: what the sources establish

The [Parliament's election explanation](https://www.parlament.ch/fr/%C3%BCber-das-parlament/portrait-du-parlement/attributions-assemblee-federale/elections/election-juges-federaux)
sets out eligibility and parliamentary election. It does not establish a universal
statutory requirement to join a party or pay it annually. Party balance in
selection, party affiliation published on a profile and a legal disclosure duty
are distinct questions; no universal affiliation-disclosure obligation has been
established by this collection.

The [Federal Justice Department's archived 2021 explanation](https://www.ejpd.admin.ch/fr/designation-des-juges-federaux-par-tirage-au-sort-initiative-sur-la-justice)
describes customary payments by magistrates to their parties and says the
practice is not prescribed by law. This is dated background, not proof that an
individual paid a particular amount in 2026. The [2022 GRECO compliance addendum](https://www.newsd.admin.ch/newsd/message/attachments/78270.pdf)
records the rejection of initiative 20.468 on 15 March 2022 and discusses party
contributions and transparency. The [2024 GRECO follow-up](https://www.sem.admin.ch/dam/bj/fr/data/sicherheit/korruption/greco/grecoberichte/bericht-iv-2024-nachtrag2.pdf.download.pdf/bericht-iv-2024-nachtrag2-f.pdf)
is a further review source. Recommendations about systemic independence do not
establish wrongdoing by particular judges.

`judicial_contribution_rules.json` starts with an actual **party-authored** rule:
the SP Solothurn finance regulation dated 6 July 2018, section II, Article 4,
published on its official website. It specifies role-based amounts for a 100%
position. These are historical cantonal-party rates, not national rates or proof
of a payment. Reductions/exemptions are possible, and present applicability has
not been established. The separate `party_entity` and `party_level` fields prevent
silently treating a cantonal payment as income of the national party.

Individual fields `annual_payment_chf`, `payment_year` and `payment_source_urls`
remain null/empty until a specific published source documents that judge, payee,
period and amount. The three profiles in `JUDICIAL_PROFILES.md` now have named
2025 national-party declarations verified in the EFK register. These declarations
are not bank-audited transfers; all other individual amounts remain unknown.
Historical matched and unmatched years are retained in
`judicial_party_contributions.json`. Never multiply a
party tariff by roster membership to claim actual money transferred. National
party funding totals likewise cannot be allocated to judges without evidence.

## Map data

Run from the repository root:

```sh
python3 scripts/collect_federal_judges.py
python3 scripts/build_swiss_network.py
python3 -m unittest discover -s tests -v
```

`network_nodes.jsonl` and `network_edges.jsonl` provide stable IDs, typed
relationships and evidence URLs. Node IDs use source person IDs or a hash of
source identity/normalized label. All parliamentary records are restricted to
bodies whose source country is CHE. An individual can still have multiple
parliamentary source records; resolving those identities is separate work.

| Relationship | Evidence | Interpretation |
| --- | --- | --- |
| `declared_interest` | Original interest record and published role | An interest declaration, not necessarily a board seat |
| `published_party_affiliation` | Person source or official judicial profile | Party label as published; tenure/membership dates not independently verified |
| `published_nominating_party` | Explicit nomination statement | Historical nomination, not current party membership |
| `published_party_sympathy` | Explicit sympathy label | Sympathy, not membership |
| `declaration_document_reference` | Source declaration link | Organization/role not extracted; not a company node |
| `listed_judicial_role` | Court roster/profile | Published court role |
| `published_workplace_affiliation` | Patent Court roster | Published firm/company affiliation, not a board appointment |

An organization node is deliberately typed `organization_label_group`, not a
verified legal entity. Matching normalized labels let the future map group
observations while displaying the unresolved identity warning. Similar names,
translations, branches and legal successors are not automatically reconciled.
Case-folding/whitespace normalization can also group homonyms: a shared label
must not be promoted to a shared legal entity without a register/source check.
Party aliases merge common published names and abbreviations only; PDC/PBD are
not silently converted to Le Centre. Compound labels remain separate.

`board_word_match` exposes an explicit board-related word found in the published
role or organization label. It is a review candidate, not proof of a current
company directorship. Some labels embed a person's role or an entire declaration;
these remain literal source labels until reviewed. Chair/member alone is
insufficient to classify a company board. All original dates remain available;
missing end dates do not establish that a mandate continues.

There are **no money-transfer edges** for unverified payments. Contribution rules
are a separate dataset and must appear with their party level, period and
historical/unverified applicability, never as individual paid sums.

For the website map, show one selected person's neighbourhood first, with filters
for relation type and court/party, plus an accessible list with the same facts.
Every displayed edge needs its source and observation/status dates. Default to
“as published” unless tenure has been checked. Do not rank guilt, influence or
conflicts from graph degree, and do not draw judge-to-litigant bias claims from
shared party or organization labels.

`network_manifest.json` records input/output hashes and graph counts. The first
export has 53,429 nodes and 51,323 edges, including 614 references to declarations
with no extracted organization name. These are not invented organization nodes.

For the additional decision/recidivism investigation, see
[JUDICIAL_DECISIONS.md](JUDICIAL_DECISIONS.md). The four briefs are separate from
the relationship graph; they do not become misconduct or guilt edges.

## Additional judicial governance observations

`judicial_public_roles.json` adds two directly identified professional governance
roles for Hofmann (Justitia 4.0 steering co-presidency and ASM/SVR committee) and
one candidate historical foundation-board match for Hurni. The latter retains
provisional identity status and a deletion publication in March 2026. It must not
be presented as a current confirmed seat. Graph edges distinguish
`published_public_governance_role` from `candidate_public_governance_role`;
organization-label nodes still do not claim complete legal-entity resolution.

## Wider judicial interest-register sources

`judicial_interest_register_sources.json` now catalogs official registers in four
cantons and preserves 15 PDF snapshots: two Aargau declarations, eleven
Graubünden regional-court registers, the Valais party-affiliation declaration and
the Zurich Administrative Court interests list. The Valais landing page also
links individual interest forms; these forms have not yet been archived or
extracted. This is partial source coverage, not a census of all Swiss judges.

Aargau's downloaded documents state **1 October 2026** (full-time) and **15 October
2026** (part-time), despite older dates in their filenames. The part-time PDF
actually has 12 pages although its landing-page label says 13. Zurich's document
states **1 January 2026**. Preserve the downloaded content and receipt rather than
assuming a URL filename or page label establishes the version.

These are self-declared affiliations, with no new individual role edges imported
until identity, role and period have been reviewed. They do not provide release,
recidivism or homicide denominators, or verify party payments. No declaration is
in itself evidence of improper influence or misconduct. The other cantons remain
unassessed in this source catalog, not presumed to lack public registers.

The previously broken BVGer April-list lead is now superseded by the replacement
PDF linked from its current official professions page. The recovered four-page
list states **16 September 2026** and is archived with its landing page and hash.
It is an additional federal source, separate from the 15 cantonal PDFs. No role
edges are imported yet; it concerns BVGer, not the three Supreme Court profiles.

The archived **Justitia 4.0 annual report 2025, page 3**, independently corroborates
Hofmann's steering co-presidency in the reporting period, naming him alongside
Florian Düblin. It strengthens the existing directly identified role, but does
not establish its end date or verify a company-board seat, payment or misconduct.

Resumed research on **25 October 2026** adds two historical primary-source
checkpoints for Hofmann without changing graph identity or creating duplicate
role edges:

- ASM's **2024 annual report, page 1**, proposes electing Hofmann to its committee,
  subject to his definitive acceptance. This is a proposal, not proof of election
  or an exact appointment date. The later published committee page remains the
  membership evidence.
- The Federal Supreme Court-hosted **Justitia 4.0 committee composition dated
  26 November 2025** directly identifies Hofmann as steering co-president and
  federal judge. It corroborates the role at that document date, not indefinite
  tenure. Both PDFs are retained with hashes in the source manifest.

## Professional editorial roles (25 October 2026)

`judicial_editorial_roles.json` records two additional directly identified roles
from the publisher's live, browser-rendered pages: **Koch edits the Criminal
Procedure Code commentary**; **Hurni co-edits the Code of Obligations commentary
with Mirjam Eggen**, edits chapter 12 PILA and is listed as interim editor for
CPC, PILA and the Lugano Convention. The pages explicitly identify their federal
judicial profession and link Koch's court biography / Hurni's professional site.
Visible-text snapshots, exact URLs, observation times and hashes are retained.

These are publishing responsibilities, **not company/foundation board seats**.
No appointment date, pay, ownership or misconduct is established. They are kept
outside the existing governance-edge export until an editorial relation type is
explicitly supported; no new graph behavior or misleading board edges added.

## Historical Hurni professional roles from Parliament

The Judicial Committee's **9 September 2020 report, page 6**, lists Hurni as
founding member of the **Schweizerisches Institut für Judikative**, chair of the
**Bern judicial training commission**, and member of the **Bern lawyers'
commission**. These three directly identified historical observations are in
`judicial_historical_professional_roles.json`; the public nomination report is
archived with its source URL, date and hash.

The report gives no exact appointment/end dates or individual remuneration for
these activities. It does not establish current tenure. Founding membership is
not a board seat. None resolves the separate provisional Ursula Wirz-Stiftung
identity match; no relationship to unrelated health-care Christoph Hurni records
is inferred. These historical records are not yet imported as graph edges.
