// Generate the home page's map of Europe (lib/map/europe.ts) from Natural
// Earth 1:50m country boundaries (public domain, via the world-atlas package).
//
//   node scripts/build-europe-map.mjs
//
// The map is projected once here, so the site ships ready-made SVG paths and
// does no geometry work per request. Projection: Lambert azimuthal equal-area
// centred on 10°E 52°N (as EPSG:3035, the EU's reference grid), framed from
// Iceland to the Urals and down to the Levant, and cropped to the frame.
//
// Borders are Natural Earth's de facto ones (the Golan Heights within
// Israel's shape), as the site's owner chose in October 2026.

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoAzimuthalEqualArea, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { presimplify, quantile, simplify } from "topojson-simplify";

const require = createRequire(import.meta.url);
const WIDTH = 1000;
// Share of border points kept (Visvalingam; shared borders stay seamless).
const KEEP = 0.15;
// Islands smaller than this (in px² on the map) are dropped; countries that
// are themselves small keep all their parts.
const MIN_ISLAND_AREA = 6;

const raw = require("world-atlas/countries-50m.json");
const pre = presimplify(raw);
// quantile(t, p) returns the weight that keeps the top share p of points.
const topology = simplify(pre, quantile(pre, KEEP));

// ISO 3166-1 numeric → alpha-2 for the countries of Europe, "from the Atlantic
// to the Urals", including the Council of Europe's transcontinental members,
// and for the Levant (Lebanon, Syria, Israel, the Palestinian territories).
// Everything else in the frame (North Africa, the rest of the Middle East,
// Central Asia, Greenland) is drawn as background.
const EUROPE = {
  "008": "AL", "020": "AD", "040": "AT", "112": "BY", "056": "BE", "070": "BA",
  "100": "BG", "191": "HR", "196": "CY", "203": "CZ", "208": "DK", "233": "EE",
  "246": "FI", "250": "FR", "276": "DE", "300": "GR", "348": "HU", "352": "IS",
  "372": "IE", "380": "IT", "428": "LV", "438": "LI", "440": "LT", "442": "LU",
  "470": "MT", "498": "MD", "492": "MC", "499": "ME", "528": "NL", "807": "MK",
  "578": "NO", "616": "PL", "620": "PT", "642": "RO", "643": "RU", "674": "SM",
  "688": "RS", "703": "SK", "705": "SI", "724": "ES", "752": "SE", "756": "CH",
  "804": "UA", "826": "GB", "336": "VA", "792": "TR", "268": "GE", "051": "AM",
  "031": "AZ", "422": "LB", "760": "SY", "376": "IL", "275": "PS",
};
// Features Natural Earth leaves without a numeric code.
const BY_NAME = { Kosovo: "XK" };

// Too small to click at this scale: the map adds a dot at their centre.
const MICROSTATES = new Set(["AD", "LI", "LU", "MC", "MT", "SM", "VA"]);
// Small covered countries in the Levant: drawn from the full-detail data (the
// simplified West Bank and Gaza are unrecognisable) and given a dot at a fixed
// point well inside each one, so the three dots don't overlap: Mount Lebanon,
// the Negev, and near Ramallah in the West Bank.
const SMALL_DOTS = { LB: [35.9, 33.95], IL: [34.85, 30.7], PS: [35.27, 31.95] };
const SMALL = new Set(Object.keys(SMALL_DOTS));

// Points the frame must contain, with a small margin: Iceland, Cape St
// Vincent, Malta, Crete, Eilat, Syria's eastern corner, the Urals (south and
// north), the North Cape.
const frame = {
  type: "MultiPoint",
  coordinates: [
    [-25.0, 63.3], [-10.0, 35.5], [14.5, 34.8], [24.0, 34.0], [34.9, 29.0],
    [42.6, 37.3], [60.0, 50.5], [60.0, 68.0], [25.8, 71.5],
  ],
};

const projection = geoAzimuthalEqualArea().rotate([-10, -52]).fitWidth(WIDTH, frame);
const [[, top], [, bottom]] = geoPath(projection).bounds(frame);
const height = Math.ceil(bottom - top);
projection.clipExtent([[0, 0], [WIDTH, height]]);
const path = geoPath(projection).digits(0);

/** Drop islets too small to see, unless the whole country is that small.
 *  Small covered countries keep every part (Gaza is part of PS). */
function withoutSpecks(f, code) {
  if (f.geometry?.type !== "MultiPolygon" || SMALL.has(code)) return f;
  const parts = f.geometry.coordinates.filter(
    (polygon) => geoPath(projection).area({ type: "Polygon", coordinates: polygon }) >= MIN_ISLAND_AREA,
  );
  if (parts.length === 0) return f;
  return { ...f, geometry: { type: "MultiPolygon", coordinates: parts } };
}

// Micro-states vanish when simplified: take them from the full-detail data.
const fullDetail = new Map(
  feature(raw, raw.objects.countries).features.map((f) => [f.id, f]),
);

const countries = [];
for (let f of feature(topology, topology.objects.countries).features) {
  const code = EUROPE[f.id] ?? BY_NAME[f.properties.name] ?? null;
  if (code && (MICROSTATES.has(code) || SMALL.has(code))) f = fullDetail.get(f.id) ?? f;
  const d = path(withoutSpecks(f, code));
  if (!d) continue; // entirely outside the frame
  const entry = { code, d };
  if (code && (MICROSTATES.has(code) || SMALL.has(code))) {
    const [x, y] = SMALL.has(code) ? projection(SMALL_DOTS[code]) : path.centroid(f);
    entry.dot = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }
  countries.push(entry);
}
// Background first, so European outlines are drawn on top of shared borders.
countries.sort((a, b) => (a.code ? 1 : 0) - (b.code ? 1 : 0));

const out = `// Generated by scripts/build-europe-map.mjs from Natural Earth 1:50m
// (public domain). Do not edit by hand.

export interface MapCountry {
  /** ISO 3166-1 alpha-2 for countries on the map; null for background. */
  code: string | null;
  /** SVG path in the map's coordinate space. */
  d: string;
  /** Click target for countries too small to hit at this scale. */
  dot?: [number, number];
}

export const EUROPE_VIEWBOX = "0 0 ${WIDTH} ${height}";

export const EUROPE_COUNTRIES: MapCountry[] = ${JSON.stringify(countries)};

/** ISO codes of the countries on the map. */
export const EUROPE_CODES: string[] = ${JSON.stringify(countries.filter((c) => c.code).map((c) => c.code).sort())};
`;
writeFileSync(new URL("../lib/map/europe.ts", import.meta.url), out);
const named = countries.filter((c) => c.code).length;
console.log(
  `lib/map/europe.ts: ${countries.length} shapes (${named} countries), ` +
    `viewBox ${WIDTH}×${height}, ${(out.length / 1024).toFixed(0)} KB`,
);
