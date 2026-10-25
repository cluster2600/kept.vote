import type { Metadata } from "next";
import { LOCALES, localePath, type Locale } from "@/lib/i18n/config";

/** Absolute site origin for canonical/hreflang URLs (search engines require
 *  absolute hreflang targets). Set as a Worker variable in
 *  cloudflare.config.ts; unset (local dev), links stay root-relative. */
export const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || undefined;

/** Canonical + hreflang alternates for a locale-independent app path. */
export function alternatesFor(lang: Locale, path: string = "/"): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localePath(l, path);
  // Locale-less URL: the proxy picks the visitor's language.
  languages["x-default"] = path;
  return { canonical: localePath(lang, path), languages };
}
