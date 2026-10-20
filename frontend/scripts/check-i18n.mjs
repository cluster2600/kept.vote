#!/usr/bin/env node
// Validate every locale dictionary against the English source of truth.
//
//   npm run check:i18n             # report problems, exit 0
//   npm run check:i18n -- --strict # exit 1 if any locale has a problem
//   npm run check:i18n -- de fr    # only check the given locales
//
// Checks per locale: missing keys, extra keys, strings where en has a plural
// object (or vice versa), `{placeholder}` mismatches, and plural objects that
// lack `other` or a category Intl.PluralRules uses for that locale.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "[lang]", "dictionaries");
const CATEGORIES = new Set(["zero", "one", "two", "few", "many", "other"]);

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const only = args.filter((a) => !a.startsWith("--"));

const load = (locale) => JSON.parse(readFileSync(join(DIR, `${locale}.json`), "utf8"));
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isPlural = (v) =>
  isObject(v) && "other" in v && Object.keys(v).every((k) => CATEGORIES.has(k));
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Flatten to { "a.b.c": string | pluralObject }, treating plurals as leaves. */
function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isObject(value) && !isPlural(value)) flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

const en = flatten(load("en"));
const locales = readdirSync(DIR)
  .filter((f) => f.endsWith(".json") && f !== "en.json")
  .map((f) => f.slice(0, -5))
  .filter((l) => only.length === 0 || only.includes(l))
  .sort();

let failing = 0;
for (const locale of locales) {
  const problems = { missing: [], extra: [], shape: [], placeholders: [], plurals: [] };
  const flat = flatten(load(locale));
  const required = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;

  for (const [path, source] of Object.entries(en)) {
    const value = flat[path];
    if (value === undefined || value === "") {
      problems.missing.push(path);
      continue;
    }
    if (isPlural(source) !== isPlural(value)) {
      problems.shape.push(`${path} (expected ${isPlural(source) ? "plural object" : "string"})`);
      continue;
    }
    if (isPlural(source)) {
      const lacking = required.filter((c) => !(c in value));
      if (lacking.length) problems.plurals.push(`${path} lacks ${lacking.join(", ")}`);
      const expected = placeholders(source.other).join(",");
      for (const [cat, text] of Object.entries(value)) {
        if (typeof text !== "string") problems.shape.push(`${path}.${cat} (expected string)`);
        else if (placeholders(text).filter((p) => p !== "count").join(",") !==
          placeholders(source.other).filter((p) => p !== "count").join(","))
          problems.placeholders.push(`${path}.${cat}: {${placeholders(text)}} vs en {${expected}}`);
      }
    } else if (typeof value !== "string") {
      problems.shape.push(`${path} (expected string)`);
    } else if (placeholders(value).join(",") !== placeholders(source).join(",")) {
      problems.placeholders.push(
        `${path}: {${placeholders(value)}} vs en {${placeholders(source)}}`,
      );
    }
  }
  for (const path of Object.keys(flat)) if (!(path in en)) problems.extra.push(path);

  const total = Object.values(problems).reduce((n, list) => n + list.length, 0);
  const translated = Object.keys(en).length - problems.missing.length;
  const header = `${locale}: ${translated}/${Object.keys(en).length} keys`;
  if (total === 0) {
    console.log(`✓ ${header}`);
    continue;
  }
  failing += 1;
  console.log(`✗ ${header}`);
  for (const [kind, list] of Object.entries(problems)) {
    if (!list.length) continue;
    const shown = kind === "missing" && list.length > 8 ? [...list.slice(0, 8), `… ${list.length - 8} more`] : list;
    console.log(`    ${kind} (${list.length}): ${shown.join("; ")}`);
  }
}

console.log(`\n${locales.length - failing}/${locales.length} locales complete (${Object.keys(en).length} keys in en).`);
if (strict && failing) process.exit(1);
