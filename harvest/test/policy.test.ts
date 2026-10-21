import assert from "node:assert/strict";
import { test } from "node:test";

import { issueToken, verifyToken } from "../src/auth.ts";
import {
  classify,
  domainCandidates,
  normalizeForHash,
  parseRobots,
  robotsAllows,
  robotsStatusFor,
  titleOf,
  urlProblem,
} from "../src/policy.ts";

test("urlProblem refuses anything that is not a public web page", () => {
  assert.equal(urlProblem("https://www.gov.pl/web/premier"), null);
  assert.equal(urlProblem("http://www.theses.fr/2003GRE21018"), null);
  assert.equal(urlProblem("ftp://example.com/x"), "only http(s) URLs");
  assert.equal(urlProblem("https://user:pw@example.com/"), "credentials in URL");
  assert.equal(urlProblem("https://example.com:8443/"), "non-standard port");
  assert.equal(urlProblem("http://localhost/admin"), "not a public host");
  assert.equal(urlProblem("http://169.254.169.254/latest/meta-data"), "private address");
  assert.equal(urlProblem("http://10.0.0.7/"), "private address");
  assert.equal(urlProblem("http://8.8.8.8/"), "IP address");
  assert.equal(urlProblem("http://[::1]/"), "private address");
  assert.equal(urlProblem("not a url"), "not a URL");
});

test("domainCandidates lists the host and its parent domains", () => {
  assert.deepEqual(domainCandidates("www.france3-regions.franceinfo.fr"), [
    "france3-regions.franceinfo.fr",
    "franceinfo.fr",
  ]);
  assert.deepEqual(domainCandidates("example.com"), ["example.com"]);
});


test("robots.txt: longest match wins, named agent groups take precedence", () => {
  const groups = parseRobots(
    ["User-agent: *", "Disallow: /private", "Allow: /private/public", "", "User-agent: kept-vote-kitesurf", "Disallow: /no-kitesurf"].join("\n"),
  );
  const ua = "kept-vote-kitesurf/1.0 (+https://kept.vote)";
  assert.equal(robotsAllows(groups, "OtherBot", "/private/x"), false);
  assert.equal(robotsAllows(groups, "OtherBot", "/private/public/x"), true);
  assert.equal(robotsAllows(groups, ua, "/no-kitesurf/page"), false);
  assert.equal(robotsAllows(groups, ua, "/private/x"), true); // its own group has no such rule
  assert.equal(robotsAllows(parseRobots("User-agent: *\nDisallow:\n"), ua, "/anything"), true);
});

test("robots.txt status follows RFC 9309", () => {
  assert.equal(robotsStatusFor(200), "parse");
  assert.equal(robotsStatusFor(404), "absent");
  assert.equal(robotsStatusFor(403), "absent"); // 4xx: no rules apply
  assert.equal(robotsStatusFor(429), "unreachable");
  assert.equal(robotsStatusFor(503), "unreachable");
  assert.equal(robotsStatusFor(null), "unreachable");
});

test("classify: bot walls and WAF block pages are blocked, not reachable", () => {
  const bunkerweb = "---\ntitle: \"Bot Detection\"\n---\n\nBUNKERWEB · SECURITY CHECK PROOF-OF-WORK\n\n### COMPUTING PROOF OF WORK\n\nYour browser is solving a small puzzle. No action needed, you will be redirected.";
  // As served by nssud.sk: the block is stated only in the title.
  const waf = "---\ntitle: \"The URL you requested has been blocked\"\n---\n\n![]()\n\n## Chyba 500 - Vnútorná chyba servera\n\n### Stránka nemôže byť zobrazená. Kontaktujte správcu webovej stránky.\n\nURL adresa: www.nssud.sk/";
  assert.equal(classify(200, bunkerweb), "blocked");
  assert.equal(classify(200, waf), "blocked");
});

test("classify: server error pages are unreachable, not reachable", () => {
  // As served for dpa.gr: Cloudflare could not reach the origin.
  const cf520 = "---\ntitle: \"kitesurf.cfdata.org | 520: Web server is returning an unknown error\"\n---\n\n# Web server is returning an unknown error Error code 520\n\n## What happened?\n\nThere is an unknown connection issue between Cloudflare and the origin web server. As a result, the web page can not be displayed.\n\n## What can I do?\n\nPlease try again in a few minutes.";
  const nginx = "---\ntitle: \"502 Bad Gateway\"\n---\n\n# 502 Bad Gateway\n\nnginx";
  assert.equal(classify(520, cf520), "unreachable");
  assert.equal(classify(null, cf520), "unreachable");
  assert.equal(classify(502, nginx), "unreachable");
  assert.equal(classify(503, ""), "unreachable");
  // A long article that mentions a server error is still a page.
  const article = "---\ntitle: \"Outage report\"\n---\n\n" + "The site showed 502 Bad Gateway for an hour. ".repeat(80);
  assert.equal(classify(200, article), "reachable");
});

test("a page that renders only its front matter is an error, but keeps its title", () => {
  // slov-lex.sk: a script-built page whose body Kitesurf can't render.
  const md = "---\ntitle: \"357/2004 Z. z. Ústavný zákon | Slov-Lex\"\n---";
  assert.equal(classify(200, md), "error");
  assert.equal(titleOf(md), "357/2004 Z. z. Ústavný zákon | Slov-Lex");
});

test("classify rendered pages", () => {
  const page = "---\ntitle: \"Prezes Rady Ministrów\"\n---\n\n# Donald Tusk\n\n" + "Real content. ".repeat(20);
  assert.equal(classify(200, page), "reachable");
  assert.equal(classify(403, page), "reachable"); // refuses plain clients, renders fine
  assert.equal(classify(404, page), "dead");
  assert.equal(classify(403, "Just a moment... Verify you are human"), "blocked");
  assert.equal(classify(200, "---\ntitle: x\n---\n"), "error");
});

test("titles and change fingerprints", () => {
  assert.equal(titleOf('---\ntitle: "Example Domain"\n---\n\nBody'), "Example Domain");
  assert.equal(titleOf("## Heading\n\nBody"), "Heading");
  assert.equal(normalizeForHash("---\ntitle: a\n---\nHello   World\n"), normalizeForHash("hello world"));
});

test("tokens: valid until expiry, bound to the key, not forgeable", async () => {
  const now = 1_800_000_000;
  const { token } = await issueToken("key-1", now);
  assert.equal(await verifyToken("key-1", token, now + 60), true);
  assert.equal(await verifyToken("key-2", token, now + 60), false);
  assert.equal(await verifyToken("key-1", token, now + 31 * 60), false);
  const [exp, sig] = token.split(".");
  assert.equal(await verifyToken("key-1", `${Number(exp) + 60}.${sig}`, now), false);
  assert.equal(await verifyToken("key-1", "garbage", now), false);
});
