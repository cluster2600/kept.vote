# Austria: Jörg Haider first profile

Started 23 October 2026. This first Austrian dataset covers Jörg Haider, not an Austrian national census. The [structured research dossier](haider.json) records sources, unresolved issues, twelve policy demands and the next five research priorities. The importable profile is in `data/jorg-haider_*.json`.

## What is ready

| Section | Coverage | Evidence / limits |
| --- | --- | --- |
| Identity | Birth 26 January 1950; death 11 October 2008; Austrian Parliament ID 490 | [Parliament biography](https://www.parlament.gv.at/person/490), last updated 13 October 2008; biographical entries can be self-reported |
| Career | Ten entries, including three separate National Council periods, two governorships, employment, party leadership and convention membership | Exact mandate dates from Parliament; year-only employment dates stay year-only |
| Education | Vienna law studies and Dr. iur., 1969–1973 | Parliament; no invented separate PhD |
| Elections | FPÖ 1999 and BZÖ 2008 national results | [Interior Ministry 1999](https://www.bmi.gv.at/412/nationalratswahlen/nationalratswahl_1999/start.html), [2008](https://www.bmi.gv.at/412/nationalratswahlen/nationalratswahl_2008/); party shares, not personal vote shares |
| Public controversies | Nazi-era employment-policy remark and removal; immigration petition; 2000 coalition dispute; minority-language signs; fatal crash; Hypo guarantee exposure | Each card has specific sources and separates political responsibility from criminal liability |
| Justice | Crash investigation closure, reported 14 April 2009 | [ORF reporting of prosecutor](https://ktnv1.orf.at/stories/355274); original prosecution file not obtained; this is not an exhaustive criminal-record search |
| Commitments | All twelve numbered demands in the 1993 Österreich zuerst petition | [Original parliamentary scan](https://www.parlament.gv.at/dokument/XVIII/I/1015/imfname_262224.pdf), printed p. 1; each demand has a locator in the dossier and no verdict |
| Financial interests / wealth / honors / legislation | Unknown; empty datasets | No zero-wealth, no-conviction or no-legislation inference from missing research |

Haider’s record concerns public conduct and political choices. Sexual orientation is neither an accountability score nor a scandal category.

## Crash and private-life claims

The documented accident occurred at Lambichl on the Loiblpass road (B91), near Klagenfurt, on 11 October 2008. Contemporary [Der Standard reporting](https://www.derstandard.at/story/1220460584014/haider-war-zum-unfallzeitpunkt-mit-142-kmh-unterwegs) gives 142 km/h. [ORF’s report of the closed investigation](https://ktnv1.orf.at/stories/355274) describes excessive speed, 1.8‰ blood alcohol, driver error and no established external interference or vehicle manipulation. That is reporting of investigative findings, not an independently inspected case file. A [later ORF chronology](https://orf.at/stories/3053161/) describes a late bar visit and an intended journey to Bärental.

Correction after reviewing contemporary coverage: the initial dossier omitted explicit relationship reporting. [The Guardian](https://www.theguardian.com/world/2008/oct/23/jorge) reported them as lovers. [Associated Press](https://www.latimes.com/archives/la-xpm-2008-oct-25-fg-haider25-story.html) noted that Petzner had not explicitly confirmed a sexual relationship. [RTVE](https://www.rtve.es/noticias/20081023/el-partido-de-haider-destituye-a-su-amigo-especial/182128.shtml) also described a relationship and relayed a reported argument followed by a gay-bar visit; its argument account depended on other press reports. These are differing interpretations and attributed accounts, not grounds to erase the subject from the research.

Petzner’s use of *Lebensmensch* is documented in a [direct 2008 interview](https://www.derstandard.at/story/1220460903904/petzner-angst-zu-haben-ist-nichts-schlechtes). A [2015 ORF memoir review](https://newsv2.orf.at/stories/2298259/) uses friendship framing; it does not settle what happened privately or invalidate all earlier reporting. The original radio recording has not been reviewed. The dossier distinguishes the public statements, their press interpretation, the reported argument and bar visit, and the still unsupported claim of departure from a lover’s home. No relationship claim establishes the cause of the crash.

Sexual orientation remains unassigned. Any accountability claim about inconsistency with Haider’s public position on gay rights needs the exact parliamentary text and his recorded vote; that primary-source check remains pending. The importable profile contains no categorical lover allegation or sexual-orientation label.

## Political and financial accountability

The [Constitutional Court’s own retrospective](https://www.vfgh.gv.at/timeline/2001__Kaerntner_Ortstafeln.de.html) documents attempts to circumvent bilingual-sign rulings. The 2011 settlement followed Haider’s death and must not become his fulfilled promise. The 1991 employment-policy remark, retraction and removal are documented in [ORF’s chronology](https://newsv1.orf.at/060916-3953/3964txt_story.html).

For Hypo, the [parliamentary inquiry transcript](https://www.parlament.gv.at/dokument/XXV/KOMM/225/fnameorig_503632.html) discusses roughly EUR 24.7 billion of regional guarantees in the 2006 accounts. That amount is a contingent public liability, not Haider’s net worth or an established cash loss. Testimony is not a judicial finding. The [2016 report index](https://www.parlament.gv.at/gegenstand/XXV/I/1291) distinguishes the report, party reports and responses; their full substantive review remains pending. No criminal conviction is inferred from these materials.

A source discrepancy is retained: Parliament compresses BZÖ leadership into 2005–2008. The dataset imports a founding role rather than asserting uninterrupted chairmanship; exact congress dates need checking. The 2000 foreign-policy source describes bilateral measures by fourteen EU member states, not an EU institutional sanction or a government headed by Haider.

## Twelve demands without invented verdicts

The dossier preserves the twelve demands as collective FPÖ commitments under Haider’s leadership. The [historical museum account](https://hdgoe.at/auslaender-volksbegehren) establishes context and the petition’s signature window. The date printed on the parliamentary document is not silently substituted for the date Haider personally made each promise.

The immigration stop is conditional; the subsidised-housing demand includes an international-law exception; the classroom ceiling concerns mother tongue, not citizenship. Demands for legal changes are not evidence those changes happened. Outcome, confidence and scores remain null until contemporaneous law and implementation have been checked.

`import_promises.py` currently creates an approved verification for every titled entry and maps unknown statuses to `no_action`. Consequently, the twelve demands remain in the research dossier. `data/jorg-haider_promises.json` is empty and **must not be used to import this research over existing promises**. Empty files mean unresearched, not a negative finding.

## Safe integration with existing tooling

No backend or frontend change is needed for the existing profile fields or country label. Source review dates, research gaps and commitment review states remain in this dossier because the current importer does not preserve that metadata. This work has not written to a running database or checked a public deployment.

To create the new profile and import only the researched sections, run in the repository’s configured API environment:

```bash
DATA_PREFIX=jorg-haider \
POLITICIAN_SLUG=jorg-haider \
BIO_JSON=data/jorg-haider_bio.json \
SECTIONS=work_history,education,electoral_history,polemics,justice \
python import_profile.py
```

The importer prunes existing records missing from each selected section and does not refresh an existing politician’s biography. Review existing Haider records first if the slug or name already exists. Do not run a full profile import over enriched data: empty unresearched datasets would clear those sections. This command leaves promises and unresearched sections untouched.

## Evidence and next batch

[Source receipts](source-downloads.json) record URLs, retrieval times, byte counts and hashes. Downloaded HTML bodies are not redistributed. The original parliamentary petition and a public institutional report are retained under `sources/`, with text extractions; extraction is not an additional independent source. The petition scan is authoritative where OCR differs. An index review does not claim full-report review.

1. Review Hypo’s primary report, responses, regional audits and original accounts; separate guarantees from realised costs and individual findings.
2. Assess the twelve petition demands against contemporaneous enacted texts and implementation evidence.
3. Extend the legal timeline using original decisions and exact person roles; locate the crash closure document.
4. Verify historical assets and interests, including Bärental ownership records; do not infer personal wealth from public spending.
5. Build Austria’s dated federal and regional roster, beginning with Carinthia, before expanding to further profiles.

Run `python3 -m unittest discover -s tests -p 'test_austria_research.py'` for dataset and importer-mapping checks. These checks establish structural consistency, not historical truth, completeness or deployment.
