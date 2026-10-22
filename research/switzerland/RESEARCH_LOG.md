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
4. Recover the original Basel rape appeal **SB.2021.9**, 30 July 2021, and check
   subsequent proceedings. Do not infer individual votes or authorship.
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
