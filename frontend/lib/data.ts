// Server-only data access. The site's content lives in Cloudflare D1 as the
// read API's JSON responses, pre-rendered from data/*.json by build_d1.py and
// stored under their API path (see d1/schema.sql). Each page loads what it
// needs in one or two queries: the Workers Free plan allows 50 D1 queries and
// 10 ms of CPU per request.

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

type DocRow = { path: string; seq: number; body: string };

// Readers always see one complete data version: a deploy loads the new rows,
// then switches meta.version in a single statement.
const CURRENT_VERSION = "(SELECT value FROM meta WHERE key = 'version')";

/** Join chunked rows back into one JSON body per path. */
function assemble(rows: DocRow[]): Map<string, string> {
  const docs = new Map<string, string>();
  for (const row of rows) {
    docs.set(row.path, (docs.get(row.path) ?? "") + row.body);
  }
  return docs;
}

/** Every document of one politician, in a single query per request. */
const politicianDocs = cache(async (slug: string) => {
  const { results } = await env.DB.prepare(
    `SELECT path, seq, body FROM docs
     WHERE version = ${CURRENT_VERSION} AND politician = ?
     ORDER BY path, seq`,
  )
    .bind(slug)
    .all<DocRow>();
  return assemble(results);
});

/** One document that isn't scoped to a politician page. */
const singleDoc = cache(async (path: string) => {
  const { results } = await env.DB.prepare(
    `SELECT path, seq, body FROM docs
     WHERE version = ${CURRENT_VERSION} AND path = ?
     ORDER BY seq`,
  )
    .bind(path)
    .all<DocRow>();
  return assemble(results).get(path);
});

async function getDoc<T>(path: string, politician?: string): Promise<T> {
  const body = politician
    ? (await politicianDocs(politician)).get(path)
    : await singleDoc(path);
  if (body === undefined) throw new NotFoundError(path);
  return JSON.parse(body) as T;
}

/** A politician page's documents all come from one query. */
const forPolitician =
  <T>(suffix: string) =>
  (id: string) =>
    getDoc<T>(`/api/politicians/${id}${suffix}`, id);

// ---- Endpoints (same paths and shapes as the FastAPI read API) -----------
export const getStatus = () => getDoc<SystemStatus>("/api/status");

export const listPoliticians = () =>
  getDoc<PoliticianSummary[]>("/api/politicians");

// A single read: the promise page needs only the name for its breadcrumb.
export const getPolitician = (id: string) =>
  getDoc<Politician>(`/api/politicians/${id}`);
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
export const getPromise = (id: string) =>
  getDoc<PromiseRecord>(`/api/promises/${id}`);

export const getPromiseVerification = (id: string) =>
  getDoc<Verification | null>(`/api/promises/${id}/verification`);
