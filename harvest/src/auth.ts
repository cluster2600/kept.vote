// Short-lived access tokens. The signing key lives only in Cloudflare Secrets
// Store (bound to this Worker); callers never hold it. A caller proves it is
// signed in to the account by writing a one-time challenge hash to this
// Worker's D1 database (harvest.py does that with `cf d1 query`), then
// exchanges the challenge for a token valid TOKEN_TTL_S seconds.

export const TOKEN_TTL_S = 30 * 60;
export const CHALLENGE_TTL_S = 2 * 60;
const CONTEXT = "kept-vote-kitesurf/v1";

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: string, message: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, encoder.encode(`${CONTEXT}:${message}`));
}

/** `<expiry unix seconds>.<signature>` */
export async function issueToken(key: string, nowS: number): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = nowS + TOKEN_TTL_S;
  return { token: `${expiresAt}.${base64url(await hmac(key, String(expiresAt)))}`, expiresAt };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyToken(key: string, token: string, nowS: number): Promise<boolean> {
  const match = token.match(/^(\d{10})\.([A-Za-z0-9_-]{43})$/);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (expiresAt <= nowS || expiresAt > nowS + TOKEN_TTL_S) return false;
  return constantTimeEqual(match[2], base64url(await hmac(key, match[1])));
}
