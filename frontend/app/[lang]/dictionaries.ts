import "server-only";
import { cache } from "react";
import en from "./dictionaries/en.json";
import type { Locale } from "@/lib/i18n/config";

/** The English dictionary is the source of truth for keys and shape. */
export type Dictionary = typeof en;

type Loader = () => Promise<{ default: unknown }>;

// One lazy import per locale so only the requested dictionary is loaded.
const loaders: Record<Locale, Loader> = {
  bg: () => import("./dictionaries/bg.json"),
  es: () => import("./dictionaries/es.json"),
  cs: () => import("./dictionaries/cs.json"),
  da: () => import("./dictionaries/da.json"),
  de: () => import("./dictionaries/de.json"),
  et: () => import("./dictionaries/et.json"),
  el: () => import("./dictionaries/el.json"),
  en: () => import("./dictionaries/en.json"),
  fr: () => import("./dictionaries/fr.json"),
  ga: () => import("./dictionaries/ga.json"),
  hr: () => import("./dictionaries/hr.json"),
  it: () => import("./dictionaries/it.json"),
  lv: () => import("./dictionaries/lv.json"),
  lt: () => import("./dictionaries/lt.json"),
  hu: () => import("./dictionaries/hu.json"),
  mt: () => import("./dictionaries/mt.json"),
  nl: () => import("./dictionaries/nl.json"),
  pl: () => import("./dictionaries/pl.json"),
  pt: () => import("./dictionaries/pt.json"),
  ro: () => import("./dictionaries/ro.json"),
  sk: () => import("./dictionaries/sk.json"),
  sl: () => import("./dictionaries/sl.json"),
  fi: () => import("./dictionaries/fi.json"),
  sv: () => import("./dictionaries/sv.json"),
  nb: () => import("./dictionaries/nb.json"),
  rm: () => import("./dictionaries/rm.json"),
};

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const PLURAL_CATEGORIES = new Set(["zero", "one", "two", "few", "many", "other"]);
const isPluralObject = (v: unknown): v is Json =>
  isObject(v) && "other" in v && Object.keys(v).every((k) => PLURAL_CATEGORIES.has(k));

/** Overlay a (possibly partial) translation onto English. Plural objects are
 *  replaced whole, since a locale's categories differ from English's. */
function mergeOver(base: Json, overlay: unknown): Json {
  if (!isObject(overlay)) return base;
  const out: Json = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const current = base[key];
    if (current === undefined) continue; // ignore keys English doesn't have
    if (isPluralObject(current)) {
      if (isPluralObject(value)) out[key] = value;
    } else if (isObject(current)) {
      out[key] = mergeOver(current, value);
    } else if (typeof value === "string" && value.trim() !== "") {
      out[key] = value;
    }
  }
  return out;
}

/** Load a locale's dictionary, falling back to English for any missing key.
 *  Cached per request so layouts, pages and components share one load. */
export const getDictionary = cache(async (locale: Locale): Promise<Dictionary> => {
  if (locale === "en") return en;
  const translated = (await loaders[locale]()).default;
  return mergeOver(en as Json, translated) as Dictionary;
});
