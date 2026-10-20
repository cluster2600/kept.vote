import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import NotFoundContent from "@/components/NotFoundContent";
import { getDictionary } from "./[lang]/dictionaries";
import {
  DEFAULT_LOCALE,
  LOCALE_HEADER,
  isLocale,
  matchAcceptLanguage,
  type Locale,
} from "@/lib/i18n/config";

// Unmatched URLs never reach the [lang] layout (the root layout lives under a
// dynamic segment), so this page renders the full shell itself.

async function resolveLocale(): Promise<Locale> {
  const h = await headers();
  const fromProxy = h.get(LOCALE_HEADER);
  if (isLocale(fromProxy)) return fromProxy;
  return matchAcceptLanguage(h.get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await resolveLocale());
  return { title: `${dict.notFound.title} — kept.vote` };
}

export default async function GlobalNotFound() {
  const lang = await resolveLocale();
  const dict = await getDictionary(lang);
  return (
    <html lang={lang}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader lang={lang} dict={dict} />
        <main className="flex-1">
          <NotFoundContent lang={lang} dict={dict} />
        </main>
        <SiteFooter dict={dict} />
      </body>
    </html>
  );
}
