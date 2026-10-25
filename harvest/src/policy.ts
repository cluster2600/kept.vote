// Pure rules for the harvest Worker: which URLs may be fetched, robots.txt,
// how a rendered page is classified, and how its content is fingerprinted.
// No bindings here, so the rules are unit-tested directly (test/).

/** The host and each parent domain, most specific first, down to two labels
 *  (a.b.example.co → a.b.example.co, b.example.co, example.co). */
export function domainCandidates(host: string): string[] {
  const labels = host.toLowerCase().replace(/^www\./, "").split(".");
  const out: string[] = [];
  for (let i = 0; i <= labels.length - 2; i++) out.push(labels.slice(i).join("."));
  return out;
}

const PRIVATE_V4 = [
  /^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

/** Why a URL may not be fetched, or null when it may (allowlist aside).
 *  Kitesurf renders on Cloudflare's network, but the harvest still refuses
 *  anything that is not a public web page. */
export function urlProblem(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "not a URL";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "only http(s) URLs";
  if (url.username || url.password) return "credentials in URL";
  if (url.port && url.port !== "443" && url.port !== "80") return "non-standard port";
  const host = url.hostname.toLowerCase();
  // IP literals: sources are cited by name, so any IP is refused.
  if (host.startsWith("[")) return "private address";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return PRIVATE_V4.some((r) => r.test(host)) ? "private address" : "IP address";
  }
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host === "localhost") {
    return "not a public host";
  }
  return null;
}

// ---- robots.txt ------------------------------------------------------------
export interface RobotsPolicy {
  /** absent: no usable robots.txt (allowed) · read: parsed · unreachable:
   *  server error or no answer (nothing may be fetched) */
  status: "absent" | "read" | "unreachable";
  allows: boolean;
}

/** RFC 9309 §2.3.1: a 4xx robots.txt (other than 429) means no rules apply;
 *  a 429, a 5xx or no answer at all means the site may not be crawled. */
export function robotsStatusFor(httpStatus: number | null): RobotsPolicy["status"] | "parse" {
  if (httpStatus === null || httpStatus === 429 || httpStatus >= 500) return "unreachable";
  if (httpStatus >= 400) return "absent";
  return httpStatus >= 200 && httpStatus < 300 ? "parse" : "unreachable";
}

export interface RobotsGroup {
  agents: string[];
  rules: { path: string; allowed: boolean }[];
}

export function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && current) {
      current.rules.push({ path: value, allowed: key === "allow" });
    }
  }
  return groups;
}

/** Longest-match robots rule for this user agent (an empty Disallow allows). */
export function robotsAllows(groups: RobotsGroup[], userAgent: string, pathAndQuery: string): boolean {
  const ua = userAgent.toLowerCase();
  const named = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  const matching = named.length ? named : groups.filter((g) => g.agents.includes("*"));
  let winner = { length: -1, allowed: true };
  for (const rule of matching.flatMap((g) => g.rules)) {
    if (!rule.path || !pathAndQuery.startsWith(rule.path)) continue;
    if (rule.path.length > winner.length || (rule.path.length === winner.length && rule.allowed)) {
      winner = { length: rule.path.length, allowed: rule.allowed };
    }
  }
  return winner.allowed;
}

// ---- Rendered pages ----------------------------------------------------------
export type HarvestStatus =
  | "reachable"
  | "dead"
  | "blocked"
  | "robots-disallowed"
  | "not-allowed"
  | "timeout"
  | "unreachable"
  | "error";

const CHALLENGE = new RegExp(
  [
    "captcha", "cloudflare.*challenge", "access denied", "access blocked", "verify you are human",
    "security checkpoint", "security check", "just a moment", "enable javascript and cookies",
    "attention required", "bot detection", "check if you are a human", "proof[- ]of[- ]work",
    "url you requested has been blocked", "request (was |has been )?(blocked|rejected)",
    "vérification de sécurité", "vérifions que vous êtes",
  ].join("|"),
  "i",
);

// Server error pages: Cloudflare's 52x pages ("520: Web server is returning an
// unknown error") and plain 5xx pages. The site is down; the page may be fine.
const SERVER_ERROR = new RegExp(
  [
    "\\b5\\d\\d: ", "error code 5\\d\\d", "web server is (returning an unknown error|down)",
    "origin is unreachable", "bad gateway", "gateway time-?out", "service (temporarily )?unavailable",
    "internal server error",
  ].join("|"),
  "i",
);

/** Classify a page from its HTTP status (plain fetch, may be null when the
 *  site refuses non-browser clients) and its Kitesurf-rendered Markdown. */
export function classify(httpStatus: number | null, markdown: string): HarvestStatus {
  if (httpStatus === 404 || httpStatus === 410) return "dead";
  const text = stripFrontmatter(markdown).trim();
  // Block pages often say so only in their title.
  const head = `${titleOf(markdown) ?? ""}\n${text.slice(0, 2000)}`;
  if (CHALLENGE.test(head) && text.length < 3000) return "blocked";
  // A short page behind a 5xx (maintenance, framework error page), or one that
  // reads as a server error, means the site is down; the page may be fine.
  if (text.length < 3000 && ((httpStatus ?? 0) >= 500 || SERVER_ERROR.test(head))) return "unreachable";
  if (text.length < 40) return httpStatus && httpStatus >= 400 ? "blocked" : "error";
  // A 401/403/429 to the plain fetch while Kitesurf saw real content means
  // the site only refuses non-browser clients: the page itself is fine.
  return "reachable";
}

export function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---(?:\n|$)/, "");
}

/** Page title from the Markdown front matter, else its first heading. */
export function titleOf(markdown: string): string | null {
  const fm = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const fromFm = fm?.[1].match(/^title:\s*"?(.*?)"?\s*$/m)?.[1];
  const heading = stripFrontmatter(markdown).match(/^#{1,2}\s+(.+)$/m)?.[1];
  const title = (fromFm || heading || "").trim();
  return title ? title.slice(0, 300) : null;
}

export const EXCERPT_CHARS = 2000;

export function excerptOf(markdown: string): string {
  return stripFrontmatter(markdown).trim().slice(0, EXCERPT_CHARS);
}

/** Text used for change detection: no front matter, case and whitespace
 *  folded, so cosmetic re-renders don't count as changes. */
export function normalizeForHash(markdown: string): string {
  return stripFrontmatter(markdown).toLowerCase().replace(/\s+/g, " ").trim();
}
