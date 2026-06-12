// Typed client for the kept.vote FastAPI backend.
//
// All calls run in React Server Components, so they execute on the server and
// read `API_BASE_URL` from the environment. `NEXT_PUBLIC_API_BASE_URL` is also
// honoured as a fallback for convenience.

export const API_BASE =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

// ---- Domain types (mirror the backend Pydantic schemas) ------------------
export type VerificationStatus =
  | "fulfilled"
  | "broken"
  | "in_progress"
  | "compromise"
  | "no_action";

export interface PoliticianSummary {
  id: string;
  name: string;
  country: string | null;
  party: string | null;
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
  party: string | null;
  birth_date: string | null;
  bio: string | null;
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

// ---- Fetch helper --------------------------------------------------------
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    // Always fetch fresh data — this is a live fact-check dashboard.
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) {
    throw new NotFoundError(path);
  }
  if (!res.ok) {
    throw new Error(`API ${res.status} on ${path}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export class NotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`);
    this.name = "NotFoundError";
  }
}

// ---- Endpoints -----------------------------------------------------------
export const getStatus = () => apiFetch<SystemStatus>("/api/status");

export const listPoliticians = () =>
  apiFetch<PoliticianSummary[]>("/api/politicians");

export const getPolitician = (id: string) =>
  apiFetch<Politician>(`/api/politicians/${id}`);

export const listPoliticianPromises = (id: string) =>
  apiFetch<PromiseWithVerification[]>(`/api/politicians/${id}/promises`);

export const getPromise = (id: string) =>
  apiFetch<PromiseRecord>(`/api/promises/${id}`);

export const getPromiseVerification = (id: string) =>
  apiFetch<Verification | null>(`/api/promises/${id}/verification`);

export const listWorkHistory = (id: string) =>
  apiFetch<WorkHistoryItem[]>(`/api/politicians/${id}/work-history`);

export const listFinances = (id: string) =>
  apiFetch<FinanceEntry[]>(`/api/politicians/${id}/finances`);

export const listPolemics = (id: string) =>
  apiFetch<Polemic[]>(`/api/politicians/${id}/polemics`);

export const listStocks = (id: string) =>
  apiFetch<StockHolding[]>(`/api/politicians/${id}/stocks`);

export const listRealEstate = (id: string) =>
  apiFetch<RealEstate[]>(`/api/politicians/${id}/real-estate`);

export const listCompanies = (id: string) =>
  apiFetch<Company[]>(`/api/politicians/${id}/companies`);

export const getSources = (id: string) =>
  apiFetch<SourcesResponse>(`/api/politicians/${id}/sources`);

export const listElectoralHistory = (id: string) =>
  apiFetch<ElectoralHistoryItem[]>(`/api/politicians/${id}/electoral-history`);

export const listInterests = (id: string) =>
  apiFetch<Interest[]>(`/api/politicians/${id}/interests`);

export const listEducation = (id: string) =>
  apiFetch<EducationItem[]>(`/api/politicians/${id}/education`);

export const listHonors = (id: string) =>
  apiFetch<Honor[]>(`/api/politicians/${id}/honors`);

export const listKeyLegislation = (id: string) =>
  apiFetch<KeyLegislationItem[]>(`/api/politicians/${id}/key-legislation`);

export const listNetWorth = (id: string) =>
  apiFetch<NetWorthPoint[]>(`/api/politicians/${id}/net-worth`);

// ---- Presentation helpers ------------------------------------------------
export interface StatusMeta {
  label: string;
  /** Tailwind classes for the badge container. */
  badge: string;
  /** Tailwind class for the status dot. */
  dot: string;
  /** Tailwind class for a track-record bar segment. */
  bar: string;
}

export const STATUS_META: Record<VerificationStatus, StatusMeta> = {
  fulfilled: {
    label: "Kept",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  broken: {
    label: "Broken",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
  in_progress: {
    label: "In Progress",
    badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  compromise: {
    label: "Compromise",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  no_action: {
    label: "No Action",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20",
    dot: "bg-slate-400",
    bar: "bg-slate-400",
  },
};

export const UNVERIFIED_META: StatusMeta = {
  label: "Unverified",
  badge: "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-400/20",
  dot: "bg-slate-300",
  bar: "bg-slate-300",
};

// Neutral, factual styling for a controversy's legal/political status. Tones
// are deliberately muted (no alarming red) — these label outcomes, not guilt.
export interface PolemicStatusMeta {
  label: string;
  badge: string;
  dot: string;
}

const POLEMIC_STATUS_META: Record<string, PolemicStatusMeta> = {
  no_charges: {
    label: "No charges",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  ongoing: {
    label: "Ongoing",
    badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    dot: "bg-amber-500",
  },
  resolved: {
    label: "Concluded",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20",
    dot: "bg-slate-400",
  },
  judicial: {
    label: "In court",
    badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    dot: "bg-amber-500",
  },
  political: {
    label: "Political",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    dot: "bg-sky-500",
  },
};

/** Resolve display meta for a polemic status string (with a safe fallback). */
const SLATE_BADGE = "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20";
const AMBER_BADGE = "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20";
const SKY_BADGE = "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20";
const EMERALD_BADGE = "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";

/** Derive a concise, neutral badge from a free-text status sentence. The full
 *  sentence is shown verbatim by the component; this only picks a short label
 *  and tone. Order matters — "victim" and "no charges" must win over the
 *  presence of investigation wording, to keep the framing accurate. */
function deriveStatusMeta(status: string): PolemicStatusMeta {
  const s = status.toLowerCase();
  if (s.includes("victim") || s.includes("victime"))
    return { label: "Victim", badge: SKY_BADGE, dot: "bg-sky-500" };
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
    return { label: "Under investigation", badge: AMBER_BADGE, dot: "bg-amber-500" };
  // A case sent to court but not yet judged (citation directe, procès renvoyé,
  // "non jugé", awaiting trial) is pending — never read it as concluded. Guard
  // against already-decided outcomes so an acquittal/conviction line isn't
  // mislabelled as awaiting trial.
  const awaitingTrial =
    /citation directe|renvoy[ée]+ (?:à|au|devant)|proc[èe]s (?:à venir|renvoy)|non jug|awaiting trial|to stand trial|stand trial|à compara[îi]tre/.test(
      s,
    ) && !/relax|acquitt|condamn|convict|rel[aâ]ch/.test(s);
  if (awaitingTrial)
    return { label: "Awaiting trial", badge: AMBER_BADGE, dot: "bg-amber-500" };
  if (s.includes("non-lieu") || s.includes("no charges"))
    return { label: "No charges", badge: EMERALD_BADGE, dot: "bg-emerald-500" };
  if (s.includes("party") || s.includes("disciplinary") || s.includes("suspension") || s.includes("expulsion"))
    return { label: "Party matter", badge: SLATE_BADGE, dot: "bg-slate-400" };
  // No proceedings opened (matter handled administratively, e.g. via a déport,
  // or "classé sans suite") — distinct from a concluded non-lieu; read as a
  // neutral, no-action-by-the-courts state.
  if (
    /no judicial proceedings|no legal proceedings|aucune proc[ée]dure judiciaire|class[ée] sans suite|no proceedings/.test(
      s,
    )
  )
    return { label: "No proceedings", badge: SKY_BADGE, dot: "bg-sky-500" };
  if (s.includes("political") || s.includes("communication") || s.includes("débat politique"))
    return { label: "Political", badge: SKY_BADGE, dot: "bg-sky-500" };
  if (s.includes("convict"))
    return { label: "Conviction", badge: SLATE_BADGE, dot: "bg-slate-400" };
  return { label: "Noted", badge: SLATE_BADGE, dot: "bg-slate-400" };
}

export function polemicStatusMeta(status: string | null): PolemicStatusMeta {
  if (status && POLEMIC_STATUS_META[status]) return POLEMIC_STATUS_META[status];
  if (!status) return { label: "Unknown", badge: SLATE_BADGE, dot: "bg-slate-400" };
  // Short unknown token: just title-case it. Long free-text status: derive a
  // concise badge (the full sentence is rendered verbatim alongside it).
  if (status.length <= 24) {
    return {
      label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      badge: SLATE_BADGE,
      dot: "bg-slate-400",
    };
  }
  return deriveStatusMeta(status);
}

// Status styling for declared-asset entries. Muted/neutral tones; the point is
// to make an explicit "None declared" read as a deliberate declaration, not as
// missing data.
const ASSET_STATUS_META: Record<string, PolemicStatusMeta> = {
  declared: {
    label: "Declared",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  estimated: {
    label: "Estimated",
    badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    dot: "bg-amber-500",
  },
  historical: {
    label: "Historical",
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
    dot: "bg-sky-500",
  },
  divested: {
    label: "Divested",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20",
    dot: "bg-slate-400",
  },
  none: {
    label: "None declared",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20",
    dot: "bg-slate-400",
  },
};

/** Resolve display meta for an asset status string (with a safe fallback). */
export function assetStatusMeta(status: string | null): PolemicStatusMeta {
  if (status && ASSET_STATUS_META[status]) return ASSET_STATUS_META[status];
  return {
    label: status
      ? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "—",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20",
    dot: "bg-slate-400",
  };
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Render a mixed-precision date string (YYYY / YYYY-MM / YYYY-MM-DD / present). */
export function prettyDate(value: string | null): string | null {
  if (!value) return null;
  if (value.toLowerCase() === "present") return "Present";
  const m = value.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!m) return value;
  const [, y, mo, d] = m;
  if (d && mo) return `${parseInt(d, 10)} ${MONTHS[+mo - 1]} ${y}`;
  if (mo) return `${MONTHS[+mo - 1]} ${y}`;
  return y;
}

/** Format an ISO date (YYYY-MM-DD) as e.g. "17 March 2022". */
export function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
