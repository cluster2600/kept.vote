# Judicial profile research log

First live pass began **22 October 2026, 22:06:50 UTC** (23 October in Zurich).
This log records completed work and outstanding questions. Scheduled elapsed time
does not count as continuous research time.

## Completed first pass

- Checked the three official biographies and correct names against court pages.
- Read the 2023 sentencing passage and the Court's 2024 explanation rejecting it.
- Checked national-party annual-income tables for 2023, 2024 and 2025 in the EFK
  public register. Seven named contribution entries matched; Hofmann was absent
  from the two earlier consulted tables. Absence remains unknown, not zero.
- Recovered the full Morges judgment. It gives the two July 2020 order dates,
  authorities, sixteen conditions and precise file references. It also establishes
  Swiss citizenship. Neither separate original release order has been recovered.
- Recovered the full Zurich appellate judgment and followed its explicit earlier
  case reference to the 2019 Basel-Landschaft sentencing judgment and its panel.
- Downloaded the BFS 2024 release-cohort workbook, current SDMX structure, national
  2010–2022 rates and 2022 demographic rates. Preserved population exclusions,
  source precision and the difference between conviction and release cohorts.
- Excluded an incomplete unfiltered SDMX response after a 55-second timeout.
  A CKAN request returned HTTP 403; used published BFS links instead.
- Saved original source files, source URLs and SHA-256 receipts. Profiles remain
  review drafts; no live website import was performed.

First pass checkpoint: **22 October 2026, 22:25:58 UTC**, about 19 minutes of
wall time since the recorded start. Sixteen focused tests and source/hash/graph
checks passed. This is a first deliverable, not a claim of hours already spent.

## Next bounded research passes

Continue until **23 October 2026, 00:25 UTC (02:25 Zurich)**, then stop and report.
Record actual start/end times of each pass and concrete queries/results. Do not
claim two hours of active searching merely because the deadline has elapsed.

1. Seek the separate Morges MPC order of 3 July 2020 (**06-10-0151**) and Bern
   Tmc order of 13 July 2020 (**03-13-0018 to 0022**). Preserve anonymisation.
2. Seek the Zurich case's September 2021 release/enforcement record and distinguish
   sentence completion from parole. Earlier sentence **BL 460 18 347**, 7 May 2019,
   is recovered; it is not the 2021 release order.
3. Seek the Basel SMV leave authorisation dated 15 December 2022, identified in
   the official Nasenweg review. Administrative leave is not a judicial acquittal.
4. Current publication of the original Basel rape appeal **SB.2021.9**,
   30 July 2021, recovered in pass 4. Check initial-publication version history
   and later finality. Do not infer individual votes or authorship.
5. Locate a newer prison-release recidivism cohort and nationality/canton breakdowns
   where published; preserve each dataset's exact universe. Seek systematic
   judge-linked decision denominators, without deriving rankings from news counts.
6. Check other public official disclosures for the three judges' professional
   governance roles and historical/cantonal party contributions. A national party's
   missing row is not non-payment.

Do not send document requests, contact judges or parties, merge, or publish the
profiles live. If originals are not public, prepare precise request drafts and
identify the gap. Do not guess identities from redacted parties or infer nationality.

## Research pass 2

**22 October 2026, 22:40:57–22:45:45 UTC**, about five minutes of active pass
wall time. The interval since the first pass was scheduled waiting, not research.

Focused queries included `"SB.2021.9" "2021" Basel Urteil`, `"AG.2021.589"`,
`"Morges" "13 juillet 2020" juge libération`, `"Nasenweg" "15. Dezember 2022"`,
`"Christoph Hurni" Stiftungsrat`, `"Sonja Koch" Bundesrichterin Vorstand`,
`"Yann-Eric Hofmann" conseil fondation`, `"1006598132"`,
`"Ursula Wirz-Stiftung" "Hurni"` and `site.svr-asm.ch "Hofmann" comité`.

Results:
- The Justitia 4.0 project's own 24 February 2025 announcement directly identifies
  federal judge Hofmann as steering co-president. The ASM/SVR current committee
  page directly identifies him as a committee member. Added both professional
  governance roles and source snapshots to the profiles and graph.
- Recovered original SHAB appointment and deletion notices for Christoph Hurni
  of Fräschels in the Ursula Wirz-Stiftung (CHE-113.802.340). Identity matches
  published biographical identifiers, but no consulted notice explicitly says he
  is the federal judge. Retained this as a candidate historical match, distinct
  from directly confirmed roles. Deletion was published on 17 March 2026; never
  present it as a current seat. Excluded unrelated namesake search results.
- Rechecked the official Basel 3 April 2024 remand decision: 42 months of
  unsuspended custody and seven years' expulsion. Recorded its publication date
  (15 March 2025), panel and distinction from the original 2021 panel. Later
  finality remains unverified.
- Original 2021 cantonal judgment, separate Morges release orders and Nasenweg
  leave authorisation still not recovered. Search hits quoting them are not
  originals. A guessed mirror path for the 2021 decision was inaccessible.
- Recovered a personal CV and contemporary official professional-role sources;
  no additional verified personal payment was found in this pass.

Validation: **17 focused tests passed**, graph has **53,429 nodes and 51,323
edges**; two directly identified governance edges and one candidate edge retain
separate types. Source hashes, endpoints, source URLs and git whitespace checks
passed. No outbound requests or website publication.

## Research pass 3

**22 October 2026, 22:56:00–23:01:27 UTC**, about five and a half minutes of
research-pass wall time, excluding the intervening scheduled wait.

Queries included `site.bfs.admin.ch "Entlassung 2019" "Rückfall"`,
`site.bfs.admin.ch "Entlassung 2020" Rückfall`, `"Morges" "03-13-0018"`,
`"Nasenweg" "Urlaub" "Verfügung"`, `site.bfs.admin.ch "Bedingte Entlassungen"
Kanton`, `site.bfs.admin.ch "Rückfall" "2019" "46,1"`, and
`"bedingte Entlassung" Kantone Studie Weber`.

Results:
- The current official BFS recidivism webpage contains an updated **2019 release
  cohort of 1,773 people**, explicitly combining Swiss nationals and foreign
  nationals with C permit. Three-year reconviction is **46.1%**, readmission
  **19.4%**. Thirteen release-cohort breakdowns were extracted from the page's
  published table, preserving missing subgroup denominators. This improves on
  the earlier recovered 2018 Swiss-only workbook without treating their
  different populations as a comparable trend. Source cutoffs are 15 October
  2025 (SVS) and 31 March 2026 (criminal register).
- Recovered Christoph Urwyler's 2020 open-access empirical study, CC BY 4.0.
  Table 53 contains historical cantonal estimates for 20 cantons. The author
  excludes six for small counts. Created a 26-canton coverage file with explicit
  nulls and retained the periods, eligibility-estimation limits and distinction
  between actual exits and formal approvals. These are not current judge or
  nationality comparisons and contain no subsequent homicide outcomes.
- Prepared five precise, anonymisation-preserving document-request drafts for
  the original orders and 2021 Basel judgment. **None was sent.** The separate
  release orders remain unrecovered; later quotations do not fill that gap.
- A bundled runtime lacked BeautifulSoup, so the public webpage table was
  extracted using the standard-library HTML parser; no dependency was added.

Validation: source hashes, exact table years/total/rates, unique canton codes,
20 present/six missing counts, historical period differences and all JSON files
checked. Existing application code and graph were unchanged in this pass.

## Research pass 4

**22 October 2026, 23:11:00–23:16:09 UTC**, about five minutes of pass wall time.
Scheduled intervals are not counted as active searching.

Queries included `"SB.2021.9" "2021" "589" Urteil pdf`,
`"Morges" "ordonnance" "juillet 2020" site:bstger.ch`,
`"Nasenweg" "15.12.2022"`, `"Sonja Koch" "Mandatsbeiträge"`,
`"Morges" "Staatshaftung" "2025" Urteil` and
`"Morges" "25'000" "2025" arrêt`.

Results:
- **Recovered the original 2021 Basel decision's current official publication.**
  Web search alone had missed it. The court's public search interface, with
  type **SB**, year **2021**, number **9**, returns two distinct decisions.
  The 2021 document key is **72292**, the 2024 key **76823**. Archived the
  current 2021 decision text and recorded its first publication (17 November
  2021) and last update (23 November 2023). An immutable first-publication
  version has not been verified.
- The 2021 panel was **Henz (chair), Renaud and Mez**, whereas the 2024
  panel was Henz, Oser and Renaud. Recorded the 2021 sentence (36 months,
  18 suspended; six years' expulsion) separately from the 2024 sentence.
- The written 2021 reasons explicitly acknowledge that brief assaults can
  severely traumatise a victim (10.4.2) and deny assigning the victim
  contributory blame (10.4.3), while still using duration in sentencing.
  Added this material context to the criticism. Portuguese nationality is
  explicit in 11.2; no later homicide is established in this case.
- A separate release order was not recovered in that dispositive text. The
  document-request draft for the currently published judgment is superseded;
  four separate original-order requests remain drafted and **unsent**.
- Recovered **A-2081/2025, 13 October 2025**, the Morges compensation appeal.
  It rejects compensation on the claimant's qualifying-partner/close-relative
  status. It is not a culpability finding or merits exoneration of the earlier
  release/monitoring decisions. Subsequent finality remains unverified.
- Rejected a false case-chain lead: **1B_107/2021** is cited for a legal
  proposition in the Basel reasoning, but concerns a different defendant and
  chronology. A shared anonymised party label or nationality is not identity.
- No new verified individual payment or separate Morges/Nasenweg order found.

Validation: archived hashes, JSON, original/remand dates, panel differences,
sentence lengths and publication-version qualifications checked. No application
or graph changes in this pass; no messages or requests sent.

## Research pass 5

**22 October 2026, 23:26:01–23:29:05 UTC**, about three minutes of source
research and validation, excluding subsequent commit/PR administration and all
scheduled idle intervals.

Queries included `"Sonja Koch" "Nebenbeschäftigungen"`,
`"Christoph Hurni" "Stiftungsrat"`, `"Christoph Hurni" "Ursula" "Wirz"`,
`"Yann-Eric Hofmann" "Mandatsbeiträge"`,
`site.bger.ch "Interessenbindungen" "Richter"`,
`site.justice.be.ch "13. Juli 2020" Terror`,
`site.bstger.ch "13 juillet 2020" libération`,
`"Nasenweg" "Verfügung" "2022"`,
`"25. September 2021" "460 18 347"`,
`"Sonja Koch" "2022" "8000" SVP`,
`"Christoph Hurni" "2022" "13020"`, and
`site.bs.ch "Nasenweg" "rechtskräftig"`.

Results:
- Located and archived four official cantonal interest-register landing pages
  and **15 PDFs**: AG two declarations, GR eleven regional-court declarations,
  VS one party-affiliation declaration and ZH one Administrative Court list.
  Added a source catalog with exact links, retrieval receipts and scopes. The
  Valais individual interest forms are linked but not downloaded in this pass.
  No individual person or role edges were imported from these documents yet.
- Aargau document contents are dated **1 October / 15 October 2026**, despite
  older filenames. Its part-time PDF has **12 pages**, despite the landing
  page's 13-page label. Zurich's declaration states **1 January 2026**.
- Search exposed a BVGer outside-activities list dated in its URL 1 April 2026,
  but direct download returned **HTTP 404**. Retained this as an unarchived lead,
  not current verified declaration data. No access restriction was bypassed.
- Relative links initially failed (GR document-relative URLs; then a relative
  HTML base). Corrected resolution using the page's base resolved against its
  source URL; all 15 archived PDFs now have validated public HTTPS URLs.
- No additional original Morges/Nasenweg/Zurich release order or historical
  individual contribution was recovered. No new direct confirmation of the
  provisional Hurni foundation identity was found. Namesake results excluded.
- Search returned secondary April 2026 reports about Nasenweg appeal withdrawal;
  no primary finality/order document was recovered, so no finality assertion or
  reverse identification was imported from those reports.

Validation: all source manifest hashes and JSON files checked; all 15 PDFs opened
with pypdf and contained extractable text; four source scopes and archive links
checked; `git diff --check` passed. No application/graph changes; no requests or
messages sent. Original-order and judge-linked denominator gaps remain.

## Research pass 6

**22 October 2026, 23:41:03–23:42:47 UTC**, about two minutes of active source
research and validation; commit/PR administration and scheduled waiting excluded.

Queries included `site.ab-ba.admin.ch Morges 2020 2023 rapport`,
`site.christophhurni.ch "Stiftung"`,
`site.bvger.ch "Nebenbeschäftigungen" Richterinnen Liste`,
`site.bstger.ch "SK.2022.35" "2024"`,
`"460 18 347" "Entlassung"`, `"SB.2021.9" "Haftentlassung"`,
`"Hofmann" "Yann-Eric" "cotisations"`,
`"Hurni" "Christoph" "Mandatsabgaben"`,
`"Koch" "Sonja" "Parteisteuer"`, and `"Morges" "03-13-0018"`.

Results:
- **Recovered the replacement BVGer outside-activities list.** The current
  official professions page links a different URL from the indexed April list
  that returned HTTP 404 in pass 5. Archived that landing page and the current
  four-page PDF, which explicitly states **16 September 2026**. Added its
  federal scope to the existing source catalog; no individual role edges were
  imported. This is not evidence about the three Supreme Court judges' roles.
- Identified and recorded a material qualification already present in the
  archived Basel remand judgment, section 3.2: as far as known to the court on
  **3 April 2024**, the appellant had not appeared again in criminal proceedings
  since the July 2021 hearing/subsequent release. This does not prove zero later
  offending or supply the missing original release order. It gives no basis
  for attaching later homicide to this rape-sentencing case.
- Precise Morges dossier-reference searching returned the later trial judgment,
  not the underlying 2020 order. No new original release/enforcement order,
  individual historical party contribution, or direct Hurni foundation identity
  confirmation was recovered.

Validation: replacement PDF opened with pypdf, four pages and printed date
checked; new source receipts/hashes, all existing manifest hashes and all JSON
checked; remand passage checked against archived text; `git diff --check` passed.
No application or graph changes, messages, document requests or publication.

## Research pass 7

**22 October 2026, 23:56:02–23:58:07 UTC**, about two minutes of source research
and validation; administrative work and scheduled idle time excluded.

Queries included `site.bfs.admin.ch bedingte Entlassung 2024 2025 Kanton Statistik`,
`site.bfs.admin.ch récidive libération homicide juge données`,
`"Morges" "13 juillet 2020" "Tmc" ordonnance original`,
`"Yann-Eric Hofmann" "conseil" "fondation"`,
`"DF_SUS_REC" site:opendata.swiss`, and
`site.bfs.admin.ch "récidive" "Swiss Stat Explorer" "2026"`.

Results:
- A federal 11 May 2026 news item pointed to broader Swiss Stat Explorer
  material. Its linked BFS page was retrieved but did not expose direct dataset
  links in the parsed HTML. The official SDMX SUS dataflow catalog then exposed
  two additional flows: **DF_SUS_REC_MODALREC** and **DF_SUS_REC_COURBREC**.
- Retrieved the first flow's structure, selected 2022 total table (11 raw
  observations) and its linked **2020** methodology report. Archived all four
  sources including the dataflow catalog, with URLs, receipt timestamps/hashes.
- The modality table's denominator is **11,401 reconvicted people**, not all
  released prisoners. Checked both count partitions against that total. The
  current general/specific codes partition the total, whereas the 2020 report's
  general-recidivism description is inclusive. Retain raw codes and mark their
  interpretation pending current-definition reconciliation; do not silently
  harmonise the two or turn more-serious recurrence into homicide counts.
- The modality flow has no judge or nationality dimension. The timing flow is
  retained as a lead only. These do not supply the requested judge-linked
  release/homicide denominators. No additional original release order or
  individual contribution was recovered.

Validation: 11 unique source-code observations, 2022/total/free-publication
filters, count partitions, PDF readability, JSON and all manifest hashes checked;
`git diff --check` passed. No application or graph changes, requests or messages.

## Research pass 8

**23 October 2026, 00:11:02–00:12:15 UTC**, about one minute of source research
and validation; commit/PR administration and all scheduled idle intervals excluded.

Queries included `site.bfs.admin.ch "Rückfall" "allgemein" "spezifisch" "2026"`,
`site.bfs.admin.ch "Récidive générale" "spécifique" 2026`,
`"Sonja Koch" "Mandatsbeitrag" 2021`,
`"Morges" "ordonnance" "3 juillet 2020"`,
`site.justice.be.ch Morges Freilassung 2020 Verfügung`,
`site.svr-asm.ch "Hurni"`, and
`site.justitia40.ch "Hofmann" "2026"`.

Results:
- Retrieved the official timing flow **DF_SUS_REC_COURBREC**, its structure and
  13 observations for the 2022 total. It provides the **56,891-person reference-
  judgment cohort denominator** and **11,401** reconvicted within three years.
  The latter matches the modality table's reconvicted denominator exactly.
- Preserved six cumulative checkpoints, not disjoint intervals, with published
  whole-percent rates. Swiss/C-permit and sentence exclusions apply; this is
  not a release cohort and has no judge or nationality subdivision. The
  general/specific modality-definition question remains unresolved.
- Archived the **Justitia 4.0 annual report 2025**: page 3 expressly identifies
  Yann-Eric Hofmann and Florian Düblin as steering co-presidents. This
  corroborates the existing role during that reporting period, not its end date
  or a company-board seat. Added corroboration to documentation without creating
  duplicate graph edges.
- No additional original release/enforcement order, historical named party
  payment, or direct confirmation of the provisional Hurni foundation match
  recovered. Search namesake results excluded.

Validation: 13 observations, monotone cumulative counts, 56,891/11,401
cross-flow denominator consistency, annual-report text/page, all JSON and source
hashes checked; `git diff --check` passed. No application or graph changes,
requests, messages, merge or publication.

## Deadline closeout

**23 October 2026, 00:26:03–00:26:27 UTC**, final validation after the
**00:25 UTC deadline**. No new source searching was started. The automation was
updated through the app tool and confirmed **PAUSED**.

The eight logged pass intervals total **42 minutes 38 seconds of pass wall time**,
including source reading and validation. This is not a measurement of continuous
active searching, and is not hours of research: scheduled gaps and subsequent
GitHub administration are excluded. The larger elapsed schedule must not be
represented as active research hours.

Final validation: **17 focused tests passed**, 55 unique manifested files matched
their hashes, network input/output hashes matched, all research JSON parsed,
53,429 unique nodes / 51,323 unique edges checked, every edge endpoint and HTTPS
source URL checked, and `git diff --check` passed. Initial module-style unittest
invocation could not import the non-package tests directory; corrected to unittest
discovery, which passed. Application runtime tests were not run; application code
and live website were not changed by these research passes.

Outstanding gaps:
- Four original-order request drafts remain **unsent**: two Morges July 2020
  orders, the Zurich case's September 2021 release/enforcement record, and Basel
  SMV's 15 December 2022 leave authorisation. Later quotations are not originals.
- No nationwide judge-linked release/reoffending/homicide denominator was found;
  no judge rankings or inferred individual fault are supported by this corpus.
- Seven named national-party declarations are verified as declarations, not
  bank-audited payments; Hofmann's 2023/2024 entries and cantonal/historical
  contributions remain unresolved. Missing rows are not proof of nonpayment.
- Hurni's foundation-board identity remains provisional; current company-board
  coverage is incomplete. Two Hofmann governance roles are directly sourced.
- The original Basel 2021 judgment's current publication is recovered; its initial
  publication version and subsequent finality of the 2024 remand are unverified.
- General/specific recidivism codes need current-definition reconciliation;
  expanded source catalogs are not complete individual role extraction.

All verified work is retained in the existing draft PR branch. No document
requests, third-party messages, merge, application import or live publication.
Further research requires a fresh user instruction or resumption; this bounded
run does not claim the original nationwide research objective is complete.

## Resumed window: 25 October 2026, pass 9

The user explicitly resumed research for a few more hours, prioritising original
release orders, historical individual party payments and board memberships of
Koch, Hurni and Hofmann. The existing automation was reactivated, with a new
bounded deadline **25 October 2026, 13:49 UTC / 14:49 Europe/Zurich**. Pause at
that deadline. No messages or document requests are authorised by this resumption.

**25 October 2026, 10:49:12–10:50:25 UTC**: initial source research and validation
interval, excluding later GitHub administration. The earlier 42m38s accounting
remains separate; scheduled elapsed time is not active research hours.

Queries included `"Christoph Hurni" "Ursula Wirz"`,
`"Yann-Eric Hofmann" "Stiftungsrat"`,
`"Sonja Koch" "Verwaltungsrat" Richterin`,
`"Morges" "13 juillet 2020" "ordonnance" tribunal`,
`"Hofmann" "Yann-Eric" "comité"`,
`"Hofmann" "Yann-Eric" "cotisation" parti`,
`"Christoph Hurni" "Stiftung" Bundesrichter`,
`"Sonja Koch" "Mandatsabgaben"`, and targeted Fribourg/party-domain searches.

Results:
- Archived ASM's **2024 annual report, page 1**: Hofmann's committee election is
  proposed **subject to definitive acceptance**. This does not establish that
  election occurred at the report date. Keep the later committee page as the
  evidence of actual membership; do not invent a precise appointment date.
- Archived the Supreme Court-hosted Justitia 4.0 committee-composition PDF dated
  **26 November 2025**, directly naming Hofmann as steering co-president and
  federal judge. It corroborates historical tenure, not an unlimited current role.
- No new original release order, named historical payment or confirmed company-
  board seat recovered in this initial pass. Namesake Sonja Koch corporate
  results and unrelated Christoph Hurni records remain excluded.
- A secondary 2021 CH Media/Watson report says the Supreme Court released a list
  of approved outside activities and that Hurni had six entries. Treat this only
  as a lead for recovering that original list; do not import six roles or amounts
  from the headline. Likewise the Onlinekommentar editors page is a professional-
  publishing lead, not automatically a legal-entity board seat.

Validation: local/remote PR branch had no divergence before work; both PDFs
opened and relevant text checked; all research JSON and source hashes checked;
`git diff --check` passed. Existing unrelated .serena directory preserved. No
application/graph change, merge, publication, messages or requests.

## Resumed pass 10 (25 October 2026)

Source work began with the **11:04:47 UTC** trigger; initial source/validation
checkpoint **11:06:36 UTC** (about two minutes pass wall time), followed by GitHub
state verification and administration. Scheduled intervals excluded.

Queries included `site.bger.ch "Nebenbeschäftigungen" "Hurni"`,
`"Hurni" "bewilligten Nebenbeschäftigungen"`,
`"Hofmann" "Mandatsbeiträge" Fribourg`,
`"Morges" "ZMG" "Juli 2020" Verfügung`,
`site.bger.ch "Nebenbeschäftigungen" filetype:pdf`,
`"Christoph Hurni" "Herausgeber" Onlinekommentar` and
`"Yann-Eric Hofmann" "Le Centre" contributions`.

Verified findings:
- Onlinekommentar's current publisher pages directly identify **Sonja Koch** as
  editor of the Criminal Procedure Code commentary and **Christoph Hurni** as
  editor/co-editor for specified commentaries. Each explicitly identifies the
  federal judicial profession and links a professional biography/site.
- Server HTML and web open yielded only a JavaScript shell. The public rendered
  pages were read in the in-app browser; visible-text snapshots, retrieval times,
  hashes and exact URLs retained. No hidden data or unpublished API was used.
- Added `judicial_editorial_roles.json`, explicitly distinguishing editorial
  responsibility from entity-board seats. Dates of appointment, pay and ownership
  remain unknown. No governance graph edges fabricated for publishing roles.
- No additional original release order, historical individual payment or confirmed
  corporate/foundation board seat recovered. The 2021 approved-side-activities
  list remains a primary-document lead, not six invented Hurni roles.

**Material GitHub state correction:** live `gh pr view 10` shows PR #10 was
**MERGED at 2026-10-25 10:46:14 UTC**, before the resumed request. This agent did
not merge it. Consequently its frozen head is a6944c5; post-merge d25b40c and
subsequent research-branch commits are not part of that merged PR. Prior resumed
wording calling it a draft was stale. The automation prompt was corrected; keep
new findings on the authorised research branch, without new PR, merge or live
publication. Historical PR descriptions should not imply these later commits
were included in the merge.

Validation: live publisher identity/role checked, two JSON records with distinct
editorial type, all manifest hashes and JSON checked; `git diff --check` passed.
Unrelated .serena directory preserved. No messages or document requests sent.
