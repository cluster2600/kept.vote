// Locale configuration shared by the proxy, server components, and the
// client-side language switcher. Keep this file free of server-only imports.

/** Supported UI locales: the 24 official EU languages (in the EU's
 *  interinstitutional protocol order, i.e. sorted by native name), followed by
 *  Norwegian Bokmål and Romansh for the non-EU countries the site covers. */
export const LOCALES = [
  "bg", "es", "cs", "da", "de", "et", "el", "en", "fr", "ga", "hr", "it",
  "lv", "lt", "hu", "mt", "nl", "pl", "pt", "ro", "sk", "sl", "fi", "sv",
  "nb", "rm",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie remembering an explicit choice made in the language switcher. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Request header the proxy sets so server code without route params (e.g.
 *  not-found) can still resolve the active locale. */
export const LOCALE_HEADER = "x-kept-locale";

/** Native language names, shown in the language switcher. */
export const AUTONYMS: Record<Locale, string> = {
  bg: "Български",
  es: "Español",
  cs: "Čeština",
  da: "Dansk",
  de: "Deutsch",
  et: "Eesti",
  el: "Ελληνικά",
  en: "English",
  fr: "Français",
  ga: "Gaeilge",
  hr: "Hrvatski",
  it: "Italiano",
  lv: "Latviešu",
  lt: "Lietuvių",
  hu: "Magyar",
  mt: "Malti",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
  sk: "Slovenčina",
  sl: "Slovenščina",
  fi: "Suomi",
  sv: "Svenska",
  nb: "Norsk bokmål",
  rm: "Rumantsch",
};

// UI locales are language-only, but Intl falls back to a default region for
// some of them: plain "pt" gets Brazilian rules (e.g. "0 promessa" instead of
// European Portuguese "0 promessas"). Map those to the European variant.
const INTL_LOCALES: Partial<Record<Locale, string>> = { pt: "pt-PT" };

/** The tag to hand to Intl constructors for a UI locale. */
export function intlLocale(lang: string): string {
  return INTL_LOCALES[lang as Locale] ?? lang;
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// Language tags browsers send that should resolve to a supported locale other
// than their base subtag: generic Norwegian ("no") and Nynorsk ("nn") readers
// get Bokmål, the closest supported written standard.
const ALIASES: Record<string, Locale> = { no: "nb", nn: "nb" };

/** Resolve a single BCP-47 tag (e.g. "pt-BR", "nb-NO") to a supported locale. */
export function resolveLocale(tag: string): Locale | null {
  const lower = tag.trim().toLowerCase();
  if (isLocale(lower)) return lower;
  const base = lower.split("-")[0];
  if (isLocale(base)) return base;
  return ALIASES[base] ?? null;
}

/** Pick the best supported locale from an Accept-Language header value.
 *
 *  A small hand-rolled matcher instead of negotiator + intl-localematcher: we
 *  only need language-level matching (UI strings are not region-specific), and
 *  the Norwegian aliasing above is explicit here rather than depending on
 *  CLDR's best-fit tables. Entries are tried in descending q order; ties keep
 *  header order. */
export function matchAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    const locale = resolveLocale(tag);
    if (locale) return locale;
  }
  return null;
}

/** Prefix an app path (starting with "/") with a locale segment. */
export function localePath(lang: Locale, path: string = "/"): string {
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}
