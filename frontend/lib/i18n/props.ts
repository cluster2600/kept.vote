import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import type { BadgeMeta } from "@/lib/api";

/** Props every server-rendered, translated component receives. */
export interface I18nProps {
  dict: Dictionary;
  lang: Locale;
}

/** Label for a badge: the dictionary entry for its key, else the raw text. */
export function badgeLabel<K extends string>(
  meta: BadgeMeta<K>,
  labels: Record<K, string>,
): string {
  return meta.key ? labels[meta.key] : (meta.raw ?? "");
}
