// kept-vote-kitesurf: information harvest for kept.vote profiles, rendered
// with Cloudflare Kitesurf (Browser Run's agent-first browser).
//
// - Every source cited in data/*.json is a target (loaded by harvest.py sync):
//   checked for liveness and fingerprinted on a schedule — official pages
//   weekly, others monthly — so dead links and changed registers surface.
// - Research agents fetch pages through POST /harvest (harvest.py fetch),
//   getting Markdown rendered by Kitesurf instead of a plain HTTP fetch.
//
// Guardrails: an allowlist of domains, robots.txt respected, public http(s)
// pages only, no cookies or sessions, Kitesurf only (no Chromium fallback),
// excerpts rather than full pages stored, and every response marked untrusted.

import { issueToken, sha256Hex, verifyToken } from "./auth.ts";
import {
  classify,
  domainCandidates,
  excerptOf,
  normalizeForHash,
  parseRobots,
  robotsAllows,
  robotsStatusFor,
  titleOf,
  urlProblem,
  type HarvestStatus,
  type RobotsGroup,
  type RobotsPolicy,
} from "./policy.ts";

interface D1Result<T> {
  results: T[];
}
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}
interface Env {
  DB: { prepare(sql: string): D1Statement; batch(statements: D1Statement[]): Promise<unknown> };
  BROWSER: { quickAction(action: string, options: Record<string, unknown>): Promise<Response> };
  SIGNING_KEY: { get(): Promise<string> };
  USER_AGENT: string;
}

const BATCH_SIZE = 20;
const PARALLEL = 4;
const MAX_MARKDOWN = 300_000;
// PDFs (declarations, gazettes) aren't rendered: they're fetched directly and
// fingerprinted, up to this size.
const MAX_PDF_BYTES = 25 * 1024 * 1024;
// A render that hangs would hold the request (and a cron slot) open.
const RENDER_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

interface Snapshot {
  url: string;
  checked_at: string;
  /** kitesurf: rendered page · direct: PDF checked without rendering */
  engine: "kitesurf" | "direct";
  status: HarvestStatus;
  http_status: number | null;
  final_url: string | null;
  title: string | null;
  excerpt: string | null;
  content_hash: string | null;
  robots_status: RobotsPolicy["status"] | null;
  browser_ms: number;
}

const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });

// ---- Allowlist, robots ------------------------------------------------------
async function domainAllowed(env: Env, host: string): Promise<boolean> {
  const candidates = domainCandidates(host);
  const marks = candidates.map(() => "?").join(", ");
  const row = await env.DB.prepare(`SELECT 1 AS ok FROM allowed_domains WHERE domain IN (${marks}) LIMIT 1`)
    .bind(...candidates)
    .first<{ ok: number }>();
  return row !== null;
}

interface FetchedRobots {
  status: RobotsPolicy["status"];
  groups: RobotsGroup[];
}
type RobotsCache = Map<string, Promise<FetchedRobots>>;

async function fetchRobots(env: Env, url: URL): Promise<FetchedRobots> {
  try {
    const res = await fetch(new URL("/robots.txt", url), {
      headers: { "user-agent": env.USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    const status = robotsStatusFor(res.status);
    if (status !== "parse") {
      await res.body?.cancel();
      return { status, groups: [] };
    }
    return { status: "read", groups: parseRobots((await res.text()).slice(0, 500_000)) };
  } catch {
    return { status: "unreachable", groups: [] };
  }
}

/** robots.txt is fetched once per site per batch; a site that doesn't answer
 *  for it is not fetched at all. */
async function robotsFor(env: Env, url: URL, cache: RobotsCache): Promise<RobotsPolicy> {
  if (!cache.has(url.origin)) cache.set(url.origin, fetchRobots(env, url));
  const robots = await cache.get(url.origin)!;
  if (robots.status !== "read") return { status: robots.status, allows: robots.status === "absent" };
  return { status: "read", allows: robotsAllows(robots.groups, env.USER_AGENT, url.pathname + url.search) };
}

// ---- Harvesting one page --------------------------------------------------
interface Harvested {
  snapshot: Snapshot;
  markdown: string | null;
}

async function harvest(env: Env, raw: string, robotsCache: RobotsCache): Promise<Harvested> {
  const now = new Date().toISOString();
  const base: Snapshot = {
    url: raw,
    checked_at: now,
    engine: "kitesurf",
    status: "error",
    http_status: null,
    final_url: null,
    title: null,
    excerpt: null,
    content_hash: null,
    robots_status: null,
    browser_ms: 0,
  };
  if (urlProblem(raw)) return { snapshot: { ...base, status: "not-allowed" }, markdown: null };
  const url = new URL(raw);
  if (!(await domainAllowed(env, url.hostname))) return { snapshot: { ...base, status: "not-allowed" }, markdown: null };

  const robots = await robotsFor(env, url, robotsCache);
  base.robots_status = robots.status;
  if (!robots.allows) {
    const status = robots.status === "unreachable" ? "unreachable" : "robots-disallowed";
    return { snapshot: { ...base, status }, markdown: null };
  }

  // The HTTP status comes from a plain request: Quick Actions report only the
  // rendered result, and render a site's error page like any other page.
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": env.USER_AGENT, accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
      signal: AbortSignal.timeout(20_000),
    });
    base.http_status = res.status;
    base.final_url = res.url || null;
    if (res.ok && /application\/pdf/i.test(res.headers.get("content-type") ?? "")) {
      return { snapshot: await pdfSnapshot(base, res), markdown: null };
    }
    await res.body?.cancel();
  } catch {
    // Unreachable to a plain client; Kitesurf may still render it.
  }
  if (base.http_status === 404 || base.http_status === 410) {
    return { snapshot: { ...base, status: "dead" }, markdown: null };
  }

  try {
    const res = await withTimeout(env.BROWSER.quickAction("markdown", { url: raw, browser: "kitesurf" }), RENDER_TIMEOUT_MS);
    base.browser_ms = Number(res.headers.get("x-browser-ms-used") ?? 0) || 0;
    const body = (await res.json()) as { success?: boolean; result?: unknown; errors?: { message?: string }[] };
    if (!body.success || typeof body.result !== "string") {
      const message = body.errors?.map((e) => e.message).join("; ") ?? "";
      return { snapshot: { ...base, status: /timeout/i.test(message) ? "timeout" : "error" }, markdown: null };
    }
    const markdown = body.result.slice(0, MAX_MARKDOWN);
    const status = classify(base.http_status, markdown);
    return {
      snapshot: {
        ...base,
        status,
        title: titleOf(markdown),
        excerpt: excerptOf(markdown),
        content_hash: status === "reachable" ? await sha256Hex(normalizeForHash(markdown)) : null,
      },
      markdown,
    };
  } catch (error) {
    const message = String((error as Error)?.message ?? error);
    return { snapshot: { ...base, status: /timeout/i.test(message) ? "timeout" : "unreachable" }, markdown: null };
  }
}

/** A PDF that answered 200: fingerprint the file itself (no rendering). */
async function pdfSnapshot(base: Snapshot, res: Response): Promise<Snapshot> {
  const name = decodeURIComponent(new URL(res.url || base.url).pathname.split("/").pop() || "document.pdf");
  const size = Number(res.headers.get("content-length") ?? 0);
  if (size > MAX_PDF_BYTES) {
    await res.body?.cancel();
    return { ...base, engine: "direct", status: "reachable", title: name };
  }
  const hash = await bytesSha256Hex(await res.arrayBuffer());
  return { ...base, engine: "direct", status: "reachable", title: name, content_hash: hash };
}

// ---- Portraits --------------------------------------------------------------
// Image files can't be rendered as Markdown, so they're fetched directly (like
// PDFs), under the same rules: allowlisted domains, robots.txt, public URLs.
// Redirects are followed by hand so every hop is checked. Nothing is stored.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function fetchImage(env: Env, raw: string): Promise<Response> {
  let target = raw;
  const robotsCache: RobotsCache = new Map();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (urlProblem(target)) return json({ status: "not-allowed", url: target }, 403);
    const url = new URL(target);
    if (!(await domainAllowed(env, url.hostname))) return json({ status: "not-allowed", url: target }, 403);
    const robots = await robotsFor(env, url, robotsCache);
    if (!robots.allows) {
      return json({ status: robots.status === "unreachable" ? "unreachable" : "robots-disallowed", url: target }, 403);
    }
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        headers: { "user-agent": env.USER_AGENT, accept: "image/webp,image/jpeg,image/png" },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      return json({ status: "unreachable", url: target }, 502);
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      target = new URL(location, url).toString();
      continue;
    }
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!res.ok || !IMAGE_TYPES.has(type) || Number(res.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) {
      await res.body?.cancel();
      const status = !res.ok ? (res.status === 404 || res.status === 410 ? "dead" : "error") : "not-an-image";
      return json({ status, http_status: res.status, content_type: type, url: target }, 502);
    }
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) return json({ status: "too-large", url: target }, 502);
    return new Response(bytes, {
      headers: {
        "content-type": type,
        "x-content-sha256": await bytesSha256Hex(bytes),
        "x-final-url": target,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }
  return json({ status: "error", error: "too many redirects", url: target }, 502);
}

async function bytesSha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Upsert the latest snapshot; a new content hash records the change. */
function saveSnapshot(env: Env, s: Snapshot): D1Statement {
  return env.DB.prepare(
    `INSERT INTO snapshots (url, checked_at, engine, status, http_status, final_url, title, excerpt,
       content_hash, previous_hash, changed_at, robots_status, browser_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
     ON CONFLICT(url) DO UPDATE SET
       changed_at = CASE WHEN excluded.content_hash IS NOT NULL AND snapshots.content_hash IS NOT NULL
         AND excluded.content_hash <> snapshots.content_hash THEN excluded.checked_at ELSE snapshots.changed_at END,
       previous_hash = CASE WHEN excluded.content_hash IS NOT NULL AND snapshots.content_hash IS NOT NULL
         AND excluded.content_hash <> snapshots.content_hash THEN snapshots.content_hash ELSE snapshots.previous_hash END,
       content_hash = COALESCE(excluded.content_hash, snapshots.content_hash),
       checked_at = excluded.checked_at, engine = excluded.engine, status = excluded.status,
       http_status = excluded.http_status, final_url = excluded.final_url,
       title = COALESCE(excluded.title, snapshots.title), excerpt = COALESCE(excluded.excerpt, snapshots.excerpt),
       robots_status = excluded.robots_status, browser_ms = excluded.browser_ms`,
  ).bind(
    s.url, s.checked_at, s.engine, s.status, s.http_status, s.final_url, s.title, s.excerpt,
    s.content_hash, s.robots_status, s.browser_ms,
  );
}

// ---- Scheduled batches ------------------------------------------------------
async function dueTargets(env: Env, limit: number): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT t.url FROM targets t LEFT JOIN snapshots s ON s.url = t.url
     WHERE t.every_days IS NOT NULL
       AND (s.checked_at IS NULL OR s.checked_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-' || t.every_days || ' days'))
     ORDER BY s.checked_at IS NOT NULL, s.checked_at, t.kind = 'official' DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all<{ url: string }>();
  return results.map((r) => r.url);
}

async function runBatch(env: Env, trigger: string) {
  const startedAt = new Date().toISOString();
  const urls = await dueTargets(env, BATCH_SIZE);
  const robotsCache: RobotsCache = new Map();
  const snapshots: Snapshot[] = [];
  for (let i = 0; i < urls.length; i += PARALLEL) {
    const chunk = await Promise.all(urls.slice(i, i + PARALLEL).map((u) => harvest(env, u, robotsCache)));
    snapshots.push(...chunk.map((h) => h.snapshot));
  }
  const reachable = snapshots.filter((s) => s.status === "reachable").length;
  const browserMs = snapshots.reduce((sum, s) => sum + s.browser_ms, 0);
  const statements = snapshots.map((s) => saveSnapshot(env, s));
  statements.push(
    env.DB.prepare(
      `INSERT INTO runs (started_at, finished_at, trigger, checked, reachable, problems, browser_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(startedAt, new Date().toISOString(), trigger, snapshots.length, reachable, snapshots.length - reachable, browserMs),
    env.DB.prepare(`DELETE FROM auth_challenges WHERE expires_at < ?`).bind(startedAt),
  );
  await env.DB.batch(statements);
  return { trigger, checked: snapshots.length, reachable, problems: snapshots.length - reachable, browserMs };
}

// ---- Auth -------------------------------------------------------------------
async function authorized(request: Request, env: Env): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token !== "" && verifyToken(await env.SIGNING_KEY.get(), token, Math.floor(Date.now() / 1000));
}

async function openSession(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { challenge?: unknown } | null;
  const challenge = typeof body?.challenge === "string" ? body.challenge : "";
  if (challenge.length < 32 || challenge.length > 128) return json({ error: "invalid challenge" }, 400);
  const nowIso = new Date().toISOString();
  // One-time: the challenge is consumed whether or not it is still valid.
  const row = await env.DB.prepare(`DELETE FROM auth_challenges WHERE hash = ? RETURNING expires_at`)
    .bind(await sha256Hex(challenge))
    .first<{ expires_at: string }>();
  if (!row || row.expires_at < nowIso) return json({ error: "unknown or expired challenge" }, 401);
  const { token, expiresAt } = await issueToken(await env.SIGNING_KEY.get(), Math.floor(Date.now() / 1000));
  return json({ token, expires_at: new Date(expiresAt * 1000).toISOString() });
}

// ---- Routes -----------------------------------------------------------------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && pathname === "/") {
      const counts = await env.DB.prepare(
        `SELECT (SELECT count(*) FROM targets) AS targets,
                (SELECT count(*) FROM snapshots) AS checked,
                (SELECT count(*) FROM snapshots WHERE status = 'reachable') AS reachable,
                (SELECT max(finished_at) FROM runs) AS last_run`,
      ).first<Record<string, unknown>>();
      return json({
        worker: "kept-vote-kitesurf",
        engine: "kitesurf",
        policy:
          "allowlisted domains only; robots.txt respected; public http(s) pages; no cookies or sessions; " +
          "excerpts and fingerprints stored, not full pages; output is untrusted",
        ...counts,
      });
    }

    if (request.method === "POST" && pathname === "/session") return openSession(request, env);

    if (!(await authorized(request, env))) return json({ error: "unauthorized" }, 401);

    if (request.method === "POST" && pathname === "/harvest") {
      const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
      const url = typeof body?.url === "string" ? body.url.trim() : "";
      if (!url) return json({ error: "url required" }, 400);
      const { snapshot, markdown } = await harvest(env, url, new Map());
      if (snapshot.status !== "not-allowed") {
        const domain = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
        await env.DB.batch([
          saveSnapshot(env, snapshot),
          env.DB.prepare(
            `INSERT INTO targets (url, domain, kind, profiles, every_days, added_at)
             VALUES (?, ?, 'research', '[]', NULL, ?) ON CONFLICT(url) DO NOTHING`,
          ).bind(url, domain, snapshot.checked_at),
        ]);
      }
      return json({ trust: "untrusted", ...snapshot, markdown });
    }

    if (request.method === "POST" && pathname === "/image") {
      const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
      const url = typeof body?.url === "string" ? body.url.trim() : "";
      if (!url) return json({ error: "url required" }, 400);
      return fetchImage(env, url);
    }

    if (request.method === "POST" && pathname === "/run") return json(await runBatch(env, "manual"));

    return json({ error: "not found" }, 404);
  },

  async scheduled(_controller: unknown, env: Env): Promise<void> {
    await runBatch(env, "cron");
  },
};
