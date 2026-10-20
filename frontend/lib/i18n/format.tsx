// Locale-aware string helpers. All Intl formatting runs on the server (Node
// ships full ICU data for every supported locale; browsers may not, which would
// cause hydration mismatches), so client components receive finished strings.

import { Fragment, type ReactNode } from "react";

import { intlLocale } from "./config";

/** A plural message: one string per CLDR plural category (`other` required). */
export type PluralMessage = Partial<
  Record<"zero" | "one" | "two" | "few" | "many", string>
> & { other: string };

/** Replace `{name}` placeholders with string values. */
export function fmt(
  template: string,
  values: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Like `fmt`, but values may be React nodes (e.g. an <em> or <abbr>). */
export function rich(
  template: string,
  values: Record<string, ReactNode>,
): ReactNode {
  const parts = template.split(/(\{\w+\})/g);
  return parts.map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/);
    if (m && m[1] in values) return <Fragment key={i}>{values[m[1]]}</Fragment>;
    return part;
  });
}

/** Pick the plural form for `count` and fill `{count}` (locale-formatted) plus
 *  any extra placeholders. */
export function plural(
  message: PluralMessage,
  count: number,
  lang: string,
  values: Record<string, string | number> = {},
): string {
  const category = new Intl.PluralRules(intlLocale(lang)).select(count);
  const template = message[category] ?? message.other;
  return fmt(template, {
    count: new Intl.NumberFormat(intlLocale(lang)).format(count),
    ...values,
  });
}

/** Format a 0–1 fraction as a whole-number percentage (e.g. "85 %" in nb). */
export function formatPercent(fraction: number, lang: string): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  return new Intl.NumberFormat(intlLocale(lang), {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(clamped);
}

/** Format an ISO date (YYYY-MM-DD) as a long date, e.g. "17 March 2022". */
export function formatDate(value: string | null, lang: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  // UTC: a date-only value must not shift a day with the server's timezone.
  return new Intl.DateTimeFormat(intlLocale(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** Render a mixed-precision date string (YYYY / YYYY-MM / YYYY-MM-DD /
 *  "present") with short month names. Anything else is returned verbatim. */
export function prettyDate(
  value: string | null,
  lang: string,
  presentLabel: string,
): string | null {
  if (!value) return null;
  if (value.toLowerCase() === "present") return presentLabel;
  const m = value.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!m) return value;
  const [, y, mo, d] = m;
  if (!mo) return y;
  const date = new Date(Date.UTC(+y, +mo - 1, d ? +d : 1));
  return new Intl.DateTimeFormat(intlLocale(lang), {
    day: d ? "numeric" : undefined,
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** True when Intl actually returned a localized name rather than echoing the
 *  code back (`fallback: "none"` yields undefined for missing data). */
function displayName(
  lang: string,
  type: "region" | "language",
  code: string,
): string | null {
  try {
    const name = new Intl.DisplayNames([intlLocale(lang), "en"], { type, fallback: "none" }).of(code);
    return name && name.toLowerCase() !== code.toLowerCase() ? name : null;
  } catch {
    return null;
  }
}

/** Localized country name for an ISO 3166-1 alpha-2 code. */
export function countryName(code: string, lang: string): string | null {
  return displayName(lang, "region", code.toUpperCase());
}

/** Localized language name for a BCP-47 code (e.g. "fr" → "French"). */
export function languageName(code: string, lang: string): string | null {
  return displayName(lang, "language", code);
}
