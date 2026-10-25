// Types and display helpers for the kept.vote data, shared by server and client
// components. The data itself is read on the server by lib/data.ts.

// ---- Domain types (mirror the backend Pydantic schemas) ------------------
export type VerificationStatus =
  | "fulfilled"
  | "broken"
  | "in_progress"
  | "compromise"
  | "no_action";

/** Kind of office a politician currently holds (labels come from the UI
 *  dictionary; `role` carries the exact title in the content language). */
export type Office =
  | "head_of_state"
  | "head_of_government"
  | "minister"
  | "legislator"
  | "mayor"
  | "regional_executive"
  | "party_leader"
  | "judge"
  | "other";

/** A politician's photo (free-licensed, from Wikimedia Commons), served from
 *  /portraits/, and the credit its license requires. */
export interface Portrait {
  file: string;
  source_url: string;
  author: string;
  license: string;
  license_url?: string | null;
}

export interface PoliticianSummary {
  id: string;
  name: string;
  country: string | null;
  /** ISO 3166-1 alpha-2, uppercase (e.g. "FR"). Optional until every profile
   *  carries it; see `countryCodeOf` for the name-based fallback. */
  country_code?: string | null;
  office?: Office | null;
  role?: string | null;
  /** BCP-47 language the profile's text is written in (e.g. "fr"). */
  content_lang?: string | null;
  party: string | null;
  portrait?: Portrait | null;
  promise_count: number;
  kept_count: number;
  broken_count: number;
  in_progress_count: number;
  compromise_count: number;
  no_action_count: number;
}

export interface Politician {
  id: string;
  name: string;
  country: string | null;
  country_code?: string | null;
  office?: Office | null;
  role?: string | null;
  content_lang?: string | null;
  party: string | null;
  birth_date: string | null;
  bio: string | null;
  portrait?: Portrait | null;
  created_at: string;
}

export interface Verification {
  id: string;
  promise_id: string;
  policy_id: string | null;
  status: VerificationStatus;
  confidence_score: number;
  reasoning: string | null;
  key_evidence: string[] | null;
  source_urls: string[] | null;
  claude_analysis: string | null;
  human_review_status: string;
  verified_date: string | null;
  created_at: string;
  updated_at: string;
}

// Named `PromiseRecord` (not `Promise`) to avoid shadowing the global Promise.
export interface PromiseRecord {
  id: string;
  politician_id: string;
  title: string;
  description: string | null;
  date_made: string | null;
  category: string | null;
  source_url: string | null;
  original_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromiseWithVerification extends PromiseRecord {
  verification: Verification | null;
}

export interface WorkHistoryItem {
  id: string;
  politician_id: string;
  external_id: string | null;
  role: string;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  category: string | null;
  source_urls: string[] | null;
  created_at: string;
}

export interface FinanceEntry {
  id: string;
  politician_id: string;
  external_id: string | null;
  year_or_period: string | null;
  type: string | null;
  label: string | null;
  amount: string | null;
  detail: string | null;
  source_urls: string[] | null;
  created_at: string;
}

export interface Polemic {
  id: string;
  politician_id: string;
  external_id: string | null;
  title: string;
  period: string | null;
  category: string | null;
  description: string | null;
  status: string | null;
  confidence_score: number | null;
  key_facts: string[] | null;
  source_urls: string[] | null;
  created_at: string;
}

export interface StockHolding {
  id: string;
  politician_id: string;
  external_id: string | null;
  holding: string;
  type: string | null;
  value: string | null;
  as_of: string | null;
  detail: string | null;
  status: string | null;
  source_urls: string[] | null;
  created_at: string;
}

export interface RealEstate {
  id: string;
  politician_id: string;
  external_id: string | null;
  property: string;
  location: string | null;
  transaction_type: string | null;
  date: string | null;
  value: string | null;
  detail: string | null;
  status: string | null;
  source_urls: string[] | null;
  created_at: string;
}

export interface Company {
  id: string;
  politician_id: string;
  external_id: string | null;
  entity: string;
  role: string | null;
  ownership_stake: string | null;
  period: string | null;
  status: string | null;
  detail: string | null;
  source_urls: string[] | null;
  created_at: string;
}

export interface ElectoralHistoryItem {
  id: string;
  external_id: string | null;
  election: string;
  date: string | null;
  role_sought: string | null;
  result: string | null;
  vote_share: string | null;
  opponent: string | null;
  detail: string | null;
  source_urls: string[] | null;
}

export interface Interest {
  id: string;
  external_id: string | null;
  item: string;
  type: string | null;
  period: string | null;
  value: string | null;
  detail: string | null;
  status: string | null;
  source_urls: string[] | null;
}

export interface EducationItem {
  id: string;
  external_id: string | null;
  institution: string;
  qualification: string | null;
  field: string | null;
  years: string | null;
  detail: string | null;
  source_urls: string[] | null;
}

export interface Honor {
  id: string;
  external_id: string | null;
  honor: string;
  awarded_by: string | null;
  year: string | null;
  detail: string | null;
  source_urls: string[] | null;
}

export interface KeyLegislationItem {
  id: string;
  external_id: string | null;
  law_name: string;
  year: string | null;
  area: string | null;
  description: string | null;
  significance: string | null;
  source_urls: string[] | null;
}

export interface NetWorthPoint {
  id: string;
  external_id: string | null;
  year: string | null;
  declared_net_worth: string | null;
  note: string | null;
  status: string | null;
  source_urls: string[] | null;
}

export interface JusticeCase {
  id: string;
  politician_id: string;
  external_id: string | null;
  case_title: string;
  period: string | null;
  type: string | null;
  description: string | null;
  status: string | null;
  outcome: string | null;
  court: string | null;
  presumption_note: string | null;
  key_facts: string[] | null;
  source_urls: string[] | null;
  created_at: string;
}

export interface SourceRef {
  url: string;
  domain: string;
  sections: string[];
}

export interface SourcesResponse {
  total: number;
  domain_count: number;
  sources: SourceRef[];
}

export interface SystemStatus {
  politicians: number;
  promises: number;
  documents: number;
  policies: number;
  verifications: number;
}

export class NotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`);
    this.name = "NotFoundError";
  }
}


// ---- Presentation helpers ------------------------------------------------
// Badge helpers return dictionary *keys* plus Tailwind tones; components look
// the label up in the active locale's dictionary.

export interface StatusStyle {
  /** Tailwind classes for the badge container. */
  badge: string;
  /** Tailwind class for the status dot. */
  dot: string;
  /** Tailwind class for a track-record bar segment. */
  bar: string;
}

export const STATUS_META: Record<VerificationStatus, StatusStyle> = {
  fulfilled: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  broken: {
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
  in_progress: {
    badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  compromise: {
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  no_action: {
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20",
    dot: "bg-slate-400",
    bar: "bg-slate-400",
  },
};

export const UNVERIFIED_META: StatusStyle = {
  badge: "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-400/20",
  dot: "bg-slate-300",
  bar: "bg-slate-300",
};

/** Dictionary keys under `legalStatus` (controversies and justice cases). */
export type LegalStatusKey =
  | "no_charges"
  | "ongoing"
  | "concluded"
  | "in_court"
  | "political"
  | "victim"
  | "under_investigation"
  | "awaiting_trial"
  | "party_matter"
  | "no_proceedings"
  | "conviction"
  | "noted"
  | "unknown"
  | "appeal_pending"
  | "convicted"
  | "acquitted"
  | "dismissed"
  | "settled";

/** Dictionary keys under `assetStatus`. */
export type AssetStatusKey =
  | "declared"
  | "estimated"
  | "historical"
  | "divested"
  | "none";

// Neutral, factual styling for a controversy's legal/political status. Tones
// are deliberately muted (no alarming red) — these label outcomes, not guilt.
export interface BadgeMeta<K extends string> {
  /** Dictionary key for the label, or null to show `raw` verbatim. */
  key: K | null;
  /** Source-data text shown when no dictionary label applies. */
  raw: string | null;
  badge: string;
  dot: string;
  /** True when the badge was derived from a longer free-text status, which
   *  should then also be shown in full. */
  derived: boolean;
}

const SLATE_BADGE = "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20";
const AMBER_BADGE = "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20";
const SKY_BADGE = "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20";
const EMERALD_BADGE = "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";
// Reserved for an *established* adverse outcome (a court conviction) — the one
// place a firmer tone is warranted, because it labels a settled fact, not an
// allegation. Never applied to ongoing/pending matters.
const ROSE_BADGE = "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20";

const TONES = {
  slate: { badge: SLATE_BADGE, dot: "bg-slate-400" },
  amber: { badge: AMBER_BADGE, dot: "bg-amber-500" },
  sky: { badge: SKY_BADGE, dot: "bg-sky-500" },
  emerald: { badge: EMERALD_BADGE, dot: "bg-emerald-500" },
  rose: { badge: ROSE_BADGE, dot: "bg-rose-500" },
} as const;

type Tone = keyof typeof TONES;

function legal(key: LegalStatusKey, tone: Tone, derived = false): BadgeMeta<LegalStatusKey> {
  return { key, raw: null, ...TONES[tone], derived };
}

const POLEMIC_STATUS_META: Record<string, BadgeMeta<LegalStatusKey>> = {
  no_charges: legal("no_charges", "emerald"),
  ongoing: legal("ongoing", "amber"),
  resolved: legal("concluded", "slate"),
  judicial: legal("in_court", "amber"),
  political: legal("political", "sky"),
};

/** Derive a concise, neutral badge from a free-text status sentence. The full
 *  sentence is shown verbatim by the component; this only picks a short label
 *  and tone. Order matters — "victim" and "no charges" must win over the
 *  presence of investigation wording, to keep the framing accurate. */
function deriveStatusMeta(status: string): BadgeMeta<LegalStatusKey> {
  const s = status.toLowerCase();
  if (s.includes("victim") || s.includes("victime"))
    return legal("victim", "sky", true);
  // A pending/ongoing matter (incl. a non-lieu only *requested*, not yet
  // granted) is "Under investigation" — checked before the concluded
  // no-charges case so we never prematurely read as cleared.
  const pending =
    /requis|requested|pending|non rendue|ouverte|en cours/.test(s) &&
    /non-lieu|information judiciaire|enqu[eê]te|investigation/.test(s);
  if (
    pending ||
    /investigation|enqu[eê]te|information judiciaire|judicial inquiry|preliminary|mise en examen/.test(s)
  )
    return legal("under_investigation", "amber", true);
  // A case sent to court but not yet judged (citation directe, procès renvoyé,
  // "non jugé", awaiting trial) is pending — never read it as concluded. Guard
  // against already-decided outcomes so an acquittal/conviction line isn't
  // mislabelled as awaiting trial.
  const awaitingTrial =
    /citation directe|renvoy[ée]+ (?:à|au|devant)|proc[èe]s (?:à venir|renvoy)|non jug|awaiting trial|to stand trial|stand trial|à compara[îi]tre/.test(
      s,
    ) && !/relax|acquitt|condamn|convict|rel[aâ]ch/.test(s);
  if (awaitingTrial) return legal("awaiting_trial", "amber", true);
  if (s.includes("non-lieu") || s.includes("no charges"))
    return legal("no_charges", "emerald", true);
  if (s.includes("party") || s.includes("disciplinary") || s.includes("suspension") || s.includes("expulsion"))
    return legal("party_matter", "slate", true);
  // No proceedings opened (matter handled administratively, e.g. via a déport,
  // or "classé sans suite") — distinct from a concluded non-lieu; read as a
  // neutral, no-action-by-the-courts state.
  if (
    /no judicial proceedings|no legal proceedings|aucune proc[ée]dure judiciaire|class[ée] sans suite|no proceedings/.test(
      s,
    )
  )
    return legal("no_proceedings", "sky", true);
  if (s.includes("political") || s.includes("communication") || s.includes("débat politique"))
    return legal("political", "sky", true);
  if (s.includes("convict")) return legal("conviction", "slate", true);
  return legal("noted", "slate", true);
}

export function polemicStatusMeta(status: string | null): BadgeMeta<LegalStatusKey> {
  if (status && POLEMIC_STATUS_META[status]) return POLEMIC_STATUS_META[status];
  if (!status) return legal("unknown", "slate");
  // Short unknown token: show it title-cased (it is source data, so it is not
  // translated). Long free-text status: derive a concise badge (the full
  // sentence is rendered verbatim alongside it).
  if (status.length <= 24) {
    return { key: null, raw: titleCase(status), ...TONES.slate, derived: false };
  }
  return deriveStatusMeta(status);
}

// Explicit, tone-controlled mapping for a justice_case's status enum. Cleared
// outcomes are emerald, in-progress matters amber, a civil settlement sky, and
// only an *established conviction* gets the firmer rose tone — an ongoing or
// pending matter is never hardened into a conviction here. Any value outside
// the documented enum (free text) falls back to the shared legal-badge logic.
const JUSTICE_STATUS_META: Record<string, BadgeMeta<LegalStatusKey>> = {
  ongoing: legal("ongoing", "amber"),
  appeal_pending: legal("appeal_pending", "amber"),
  convicted: legal("convicted", "rose"),
  acquitted: legal("acquitted", "emerald"),
  dismissed: legal("dismissed", "emerald"),
  no_charges: legal("no_charges", "emerald"),
  settled: legal("settled", "sky"),
  other: legal("noted", "slate"),
};

/** Resolve a badge for a justice_case status. Known enum values map to a fixed,
 *  tone-controlled badge; anything else reuses the polemic/legal derivation. */
export function justiceStatusMeta(status: string | null): BadgeMeta<LegalStatusKey> {
  if (status) {
    const key = status.trim().toLowerCase();
    if (JUSTICE_STATUS_META[key]) return JUSTICE_STATUS_META[key];
  }
  return polemicStatusMeta(status);
}

// Status styling for declared-asset entries. Muted/neutral tones; the point is
// to make an explicit "None declared" read as a deliberate declaration, not as
// missing data.
const ASSET_STATUS_META: Record<string, { key: AssetStatusKey; tone: Tone }> = {
  declared: { key: "declared", tone: "emerald" },
  estimated: { key: "estimated", tone: "amber" },
  historical: { key: "historical", tone: "sky" },
  divested: { key: "divested", tone: "slate" },
  none: { key: "none", tone: "slate" },
};

/** Resolve display meta for an asset status string (with a safe fallback). */
export function assetStatusMeta(status: string | null): BadgeMeta<AssetStatusKey> {
  const known = status ? ASSET_STATUS_META[status] : undefined;
  if (known) return { key: known.key, raw: null, ...TONES[known.tone], derived: false };
  return {
    key: null,
    raw: status ? titleCase(status) : "—",
    ...TONES.slate,
    derived: false,
  };
}

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// English country names used by profiles that predate `country_code`.
const COUNTRY_CODES: Record<string, string> = {
  austria: "AT", belgium: "BE", bulgaria: "BG", croatia: "HR", cyprus: "CY",
  czechia: "CZ", "czech republic": "CZ", denmark: "DK", estonia: "EE",
  finland: "FI", france: "FR", germany: "DE", greece: "GR", hungary: "HU",
  ireland: "IE", italy: "IT", latvia: "LV", lithuania: "LT",
  luxembourg: "LU", malta: "MT", netherlands: "NL", "the netherlands": "NL",
  poland: "PL", portugal: "PT", romania: "RO", slovakia: "SK",
  slovenia: "SI", spain: "ES", sweden: "SE", switzerland: "CH", norway: "NO",
};

/** ISO country code for a politician: the explicit field, else derived from
 *  the English country name. */
export function countryCodeOf(p: {
  country_code?: string | null;
  country: string | null;
}): string | null {
  if (p.country_code) return p.country_code.toUpperCase();
  if (!p.country) return null;
  return COUNTRY_CODES[p.country.trim().toLowerCase()] ?? null;
}
