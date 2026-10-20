import type { Metadata } from "next";
import { LOCALES, localePath, type Locale } from "@/lib/i18n/config";

/** Absolute site origin for canonical/hreflang URLs (search engines require
 *  absolute hreflang targets). SITE_URL wins; on Vercel the production domain
 *  is used automatically. Unset elsewhere, links stay root-relative. */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (vercelHost ? `https://${vercelHost}` : undefined);

/** Canonical + hreflang alternates for a locale-independent app path. */
export function alternatesFor(lang: Locale, path: string = "/"): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localePath(l, path);
  // Locale-less URL: the proxy picks the visitor's language.
  languages["x-default"] = path;
  return { canonical: localePath(lang, path), languages };
}
