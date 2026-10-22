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
export has 53,426 nodes and 51,320 edges, including 614 references to declarations
with no extracted organization name. These are not invented organization nodes.

For the additional decision/recidivism investigation, see
[JUDICIAL_DECISIONS.md](JUDICIAL_DECISIONS.md). The four briefs are separate from
the relationship graph; they do not become misconduct or guilt edges.
