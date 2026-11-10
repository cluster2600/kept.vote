// Server-only data access. The site's content lives in Cloudflare D1 as the
// read API's JSON responses, pre-rendered from data/*.json by build_d1.py and
// stored under their API path (see d1/schema.sql). Each page loads what it
// needs in one to three queries.

import "server-only";

import { env } from "cloudflare:workers";
import { cache } from "react";

import {
  NotFoundError,
  type Company,
  type EducationItem,
  type ElectoralHistoryItem,
  type FinanceEntry,
  type Honor,
  type Interest,
  type JusticeCase,
  type KeyLegislationItem,
  type NetWorthPoint,
  type Polemic,
  type Politician,
  type PoliticianSummary,
  type PromiseRecord,
  type PromiseWithVerification,
  type RealEstate,
  type SourcesResponse,
  type StockHolding,
  type SystemStatus,
  type Verification,
  type WorkHistoryItem,
} from "./api";

type DocRow = { path: string; seq: number; lang: string; body: string };

// Readers always see one complete data version: a deploy loads the new rows,
// then switches meta.version in a single statement.
const CURRENT_VERSION = "(SELECT value FROM meta WHERE key = 'version')";

/** The untranslated original, in the profile's own content_lang. */
const SOURCE_LANG = "src";

/**
 * Join chunked rows back into one JSON body per path, preferring the active
 * locale over the source.
 *
 * A locale only has rows for documents whose text actually differs once
 * translated (see build_d1.py), and a build can publish a subset of locales,
 * so every path falls back to `src`. Picking the winner per path — rather than
 * per query — means a page never mixes the two for one document.
 */
function assemble(rows: DocRow[], lang: string): Map<string, string> {
  const byLang = new Map<string, Map<string, string>>();
  for (const row of rows) {
    let docs = byLang.get(row.lang);
    if (!docs) byLang.set(row.lang, (docs = new Map()));
    docs.set(row.path, (docs.get(row.path) ?? "") + row.body);
  }
  const translated = byLang.get(lang);
  const source = byLang.get(SOURCE_LANG) ?? new Map<string, string>();
  if (!translated) return source;
  const merged = new Map(source);
  for (const [path, body] of translated) merged.set(path, body);
  return merged;
}

/** Every document of one politician, in a single query per request. */
const politicianDocs = cache(async (slug: string, lang: string) => {
  const { results } = await env.DB.prepare(
    `SELECT path, seq, lang, body FROM docs
     WHERE version = ${CURRENT_VERSION} AND politician = ?
       AND lang IN (?, '${SOURCE_LANG}')
     ORDER BY path, seq`,
  )
    .bind(slug, lang)
    .all<DocRow>();
  return assemble(results, lang);
});

/** One document that isn't scoped to a politician page. */
const singleDoc = cache(async (path: string, lang: string) => {
  const { results } = await env.DB.prepare(
    `SELECT path, seq, lang, body FROM docs
     WHERE version = ${CURRENT_VERSION} AND path = ?
       AND lang IN (?, '${SOURCE_LANG}')
     ORDER BY seq`,
  )
    .bind(path, lang)
    .all<DocRow>();
  return assemble(results, lang).get(path);
});

async function getDoc<T>(
  path: string,
  lang: string,
  politician?: string,
): Promise<T> {
  const body = politician
    ? (await politicianDocs(politician, lang)).get(path)
    : await singleDoc(path, lang);
  if (body === undefined) throw new NotFoundError(path);
  return JSON.parse(body) as T;
}

/**
 * A politician page's documents all come from one query.
 *
 * Every reader takes the active UI locale: profile text is machine-translated
 * per locale at build time, and the locale decides which body is served.
 */
const forPolitician =
  <T>(suffix: string) =>
  (id: string, lang: string) =>
    getDoc<T>(`/api/politicians/${id}${suffix}`, lang, id);

// ---- Endpoints (same paths and shapes as the FastAPI read API) -----------
export const getStatus = (lang: string) =>
  getDoc<SystemStatus>("/api/status", lang);

export const listPoliticians = (lang: string) =>
  getDoc<PoliticianSummary[]>("/api/politicians", lang);

// A single read: the promise page needs only the name for its breadcrumb.
export const getPolitician = (id: string, lang: string) =>
  getDoc<Politician>(`/api/politicians/${id}`, lang);
export const listPoliticianPromises =
  forPolitician<PromiseWithVerification[]>("/promises");
export const listWorkHistory = forPolitician<WorkHistoryItem[]>("/work-history");
export const listFinances = forPolitician<FinanceEntry[]>("/finances");
export const listPolemics = forPolitician<Polemic[]>("/polemics");
export const listStocks = forPolitician<StockHolding[]>("/stocks");
export const listRealEstate = forPolitician<RealEstate[]>("/real-estate");
export const listCompanies = forPolitician<Company[]>("/companies");
export const getSources = forPolitician<SourcesResponse>("/sources");
export const listElectoralHistory =
  forPolitician<ElectoralHistoryItem[]>("/electoral-history");
export const listInterests = forPolitician<Interest[]>("/interests");
export const listEducation = forPolitician<EducationItem[]>("/education");
export const listHonors = forPolitician<Honor[]>("/honors");
export const listKeyLegislation =
  forPolitician<KeyLegislationItem[]>("/key-legislation");
export const listNetWorth = forPolitician<NetWorthPoint[]>("/net-worth");
export const listJustice = forPolitician<JusticeCase[]>("/justice");

// Promise pages read just their own two documents rather than the whole
// politician (Macron's documents alone are over 1 MB).
export const getPromise = (id: string, lang: string) =>
  getDoc<PromiseRecord>(`/api/promises/${id}`, lang);

export const getPromiseVerification = (id: string, lang: string) =>
  getDoc<Verification | null>(`/api/promises/${id}/verification`, lang);

/**
 * Whether a locale has translated profile text in the current data version.
 *
 * Pages use this to show the "machine-translated" notice only when the reader
 * is actually looking at machine output — a locale with no published
 * translations falls back to the source text, which needs no disclaimer.
 */
export const hasTranslations = cache(async (lang: string) => {
  if (lang === SOURCE_LANG) return false;
  const row = await env.DB.prepare(
    `SELECT 1 AS present FROM docs
     WHERE version = ${CURRENT_VERSION} AND lang = ? LIMIT 1`,
  )
    .bind(lang)
    .first<{ present: number }>();
  return row !== null;
});
