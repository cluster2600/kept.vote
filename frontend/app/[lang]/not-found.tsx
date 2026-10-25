import { headers } from "next/headers";
import NotFoundContent from "@/components/NotFoundContent";
import { getDictionary } from "./dictionaries";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale } from "@/lib/i18n/config";

/** 404 for notFound() raised inside a [lang] page (e.g. an unknown
 *  politician id); unmatched URLs use app/global-not-found.tsx instead. */
export default async function NotFound() {
  // not-found receives no route params; the proxy forwards the locale instead.
  const fromHeader = (await headers()).get(LOCALE_HEADER);
  const lang = isLocale(fromHeader) ? fromHeader : DEFAULT_LOCALE;
  const dict = await getDictionary(lang);
  return <NotFoundContent lang={lang} dict={dict} />;
}
