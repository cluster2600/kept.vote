# Nationwide comparative evidence

Checked 23 October 2026. `national_comparative_data.json` contains **13 national
annual observations, 52 demographic observations for 2022 and 167 historical
release-cohort breakdowns**, plus **13 current 2019 release-cohort breakdowns**
and a qualified historical comparison covering 20 cantons (six missing). Original source files are retained under `sources/`.
This is national statistical context, not a comparison of individual judges.

## Reconviction after a reference judgment

The current [BFS SDMX dataset](https://disseminate.stats.swiss/rest/dataflow/CH1.SUS/DF_SUS_REC_UNVRSDPRT?references=all)
covers Swiss citizens and foreign citizens with a C permit. It excludes people
sentenced to more than six months of unsuspended custody. It follows new felonies
or misdemeanours within three years of the reference judgment. It does not start
the clock at release from prison.

| Reference judgment year | Reconviction within three years (%) |
| --- | ---: |
| 2010 | 23 |
| 2011 | 23 |
| 2012 | 24 |
| 2013 | 24 |
| 2014 | 24 |
| 2015 | 23 |
| 2016 | 23 |
| 2017 | 24 |
| 2018 | 23 |
| 2019 | 23 |
| 2020 | 22 |
| 2021 | 22 |
| 2022 | 20 |

[Exact national query](https://disseminate.stats.swiss/rest/data/CH1.SUS,DF_SUS_REC_UNVRSDPRT/_T._T._T._T._T.REC_3..A?startPeriod=2010&endPeriod=2022&dimensionAtObservation=AllDimensions).
The source publishes whole percentages, not decimal precision or cohort counts
in these series. Recent cohorts may be revised as final convictions enter VOSTRA.

For the 2022 reference cohort, the corresponding rates are **21% for men, 16% for
women; 15% with no previous conviction, 30% with one, and 47% with at least two**.
Previous convictions are measured in the three years preceding the reference
judgment. These are descriptive groups with different case mixes, not estimates
of causal effects or professional fault.
[Exact demographic query](https://disseminate.stats.swiss/rest/data/CH1.SUS,DF_SUS_REC_UNVRSDPRT/_T..._T..REC_3..A?startPeriod=2022&endPeriod=2022&dimensionAtObservation=AllDimensions).

The dimensions of this particular dataset contain **no judge, panel, nationality
or canton identifier**. It combines the two eligible nationality groups; it cannot
compare them. Other BFS datasets may have different dimensions and populations.

## Updated official release cohort: 2019

The [current BFS summary page](https://www.bfs.admin.ch/bfs/de/home/statistiken/kriminalitaet-strafrecht/rueckfall.html)
reports **1,773 adults released in 2019**, including Swiss nationals and foreign
nationals with a C permit. Within three years, **46.1% were reconvicted and 19.4%
were readmitted**. Source snapshots are dated 15 October 2025 (SVS) and 31 March
2026 (criminal register). These are different outcomes, neither a homicide rate.

| Published group in the 2019 release cohort | Reconviction (%) | Readmission (%) |
| --- | ---: | ---: |
| Total | 46.1 | 19.4 |
| Men | 45.1 | 18.5 |
| Women | 53.2 | 25.2 |
| No prior conviction | 33.5 | 8.9 |
| One prior conviction | 38.6 | 16.4 |
| At least two prior convictions | 59.7 | 28.4 |
| Initial violent offence category | 38.6 | 14.7 |

The violent-offence row describes the **initial offence group**. It does not
report how many people later committed homicide or another violent offence.
Subgroup denominators and exact reconviction/readmission counts are not supplied
in that table and remain null. The eligible nationality groups are combined,
without a nationality breakdown. The older workbook below is kept as a distinct
Swiss-only population and must not be treated as a like-for-like trend.

## Reconviction after imprisonment: an older, separate population

The recovered [BFS 2024 workbook, table T 19.06.01.01](https://dam-api.bfs.admin.ch/hub/api/dam/assets/32809186/master)
contains selected release cohorts from 1988 to 2018. Its footnote explicitly
excludes foreign nationals. For its latest sheet, **2018**, it reports:

| Population within that Swiss-only release cohort | Released | Reconvicted within three years | Rate (%) |
| --- | ---: | ---: | ---: |
| Total | 1,346 | 644 | 47.85 |
| No previous conviction | 383 | 130 | 33.94 |
| One previous conviction | 454 | 179 | 39.43 |
| At least two previous convictions | 509 | 335 | 65.82 |

The same total cohort records **309 readmissions (22.96%)**. Readmission and
reconviction are distinct measures. None of these figures is a homicide rate.
The worksheet, row and cells for every extracted observation are in the JSON.

The 2018 release figure of 47.85% and the 2022 reference-judgment figure of 20%
must not be presented as a decline: their populations, events and dates differ.

## Missing evidence for the requested judge comparison

A valid judge comparison needs a systematic cohort of release decisions, named
decision-makers, eligibility and risk information available at the time, subsequent
final convictions, equivalent follow-up and all eligible decisions as denominators.
The recovered national data do not contain those links. Publicised homicide cases
cannot supply the missing denominator. No ranking of judges by foreign-national
release, later homicide or “absurdity” is supported here.

The separate release orders sought in Morges, Zurich and Basel remain outstanding.
The Morges full judgment now identifies exact dates, authorities and file references
for its earlier orders. See `JUDICIAL_DECISIONS.md` and the case JSON.

## Historical cantonal comparison, with missing cantons retained

Christoph Urwyler's 2020 empirical study reproduces BFS estimates in **table 53,
printed page 395 (PDF page 450)**. The following figures concern **2001–2016**.
They estimate actual conditional exits among an estimated eligible population
with custody over 91 days, including treatment measures. They are not current
judge approval rates. [Study, CC BY 4.0](https://open-ius.ch/literatur/urwyler_praxis-bedingte-entlassung.pdf).

| Canton | Historical estimated conditional release (%) |
| --- | ---: |
| AG | 69 |
| AI | Not published |
| AR | Not published |
| BE | 61 |
| BL | 76 |
| BS | 74 |
| FR | 62 |
| GE | 70 |
| GL | Not published |
| GR | 58 |
| JU | 78 |
| LU | 73 |
| NE | 70 |
| NW | Not published |
| OW | Not published |
| SG | 70 |
| SH | 56 |
| SO | 69 |
| SZ | 64 |
| TG | 77 |
| TI | 67 |
| UR | Not published |
| VD | 50 |
| VS | 66 |
| ZG | 61 |
| ZH | 76 |

The author omitted six cantons because of small counts. Eligibility estimates,
counting rules and case mix limit comparisons (study pages 125–132). No judge,
nationality or subsequent-homicide breakdown is supplied. Full periods, original
rounded values and explicit nulls are in `historical_cantonal_release_comparison.json`.
