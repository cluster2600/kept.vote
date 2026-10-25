import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getDictionary } from "./dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { SITE_URL, alternatesFor } from "@/lib/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: alternatesFor(lang),
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <html lang={lang}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader lang={lang} dict={dict} />
        <main className="flex-1">{children}</main>
        <SiteFooter dict={dict} />
      </body>
    </html>
  );
}
