import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  countryCodeOf,
  getPolitician,
  getSources,
  listCompanies,
  listEducation,
  listElectoralHistory,
  listFinances,
  listHonors,
  listInterests,
  listJustice,
  listKeyLegislation,
  listNetWorth,
  listPolemics,
  listPoliticianPromises,
  listRealEstate,
  listStocks,
  listWorkHistory,
  NotFoundError,
  type Company,
  type EducationItem,
  type ElectoralHistoryItem,
  type FinanceEntry,
  type Honor,
  type Interest,
  type JusticeCase,
  type KeyLegislationItem,
  type NetWorthPoint,
  type Polemic,
  type Politician,
  type PromiseWithVerification,
  type RealEstate,
  type SourcesResponse,
  type StockHolding,
  type VerificationStatus,
  type WorkHistoryItem,
} from "@/lib/api";
import TrackRecord from "@/components/TrackRecord";
import PoliticianProfile from "@/components/PoliticianProfile";
import { getDictionary } from "../../dictionaries";
import { isLocale, localePath } from "@/lib/i18n/config";
import { countryName, fmt, languageName, plural } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  return isLocale(lang) ? { alternates: alternatesFor(lang, `/politicians/${id}`) } : {};
}

export default async function PoliticianPage({ params }: Props) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  // The core politician record is the only thing whose absence means "no such
  // page": a 404 here is a genuine not-found → render the 404 page.
  let politician: Politician;
  try {
    politician = await getPolitician(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  // Profile sections are resilient. A single section endpoint that 404s (e.g.
  // the justice route before it's deployed), 500s, or errors transiently must
  // NEVER blank the whole page — degrade it to empty and still render the rest.
  const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
    p.catch((err) => {
      console.error(`[politician ${id}] section fetch failed:`, err);
      return fallback;
    });
  const emptySources: SourcesResponse = { total: 0, domain_count: 0, sources: [] };

  const [
    promises,
    workHistory,
    finances,
    polemics,
    stocks,
    realEstate,
    companies,
    sources,
    electoral,
    interests,
    education,
    honors,
    legislation,
    netWorth,
    justice,
  ] = await Promise.all([
    safe(listPoliticianPromises(id), [] as PromiseWithVerification[]),
    safe(listWorkHistory(id), [] as WorkHistoryItem[]),
    safe(listFinances(id), [] as FinanceEntry[]),
    safe(listPolemics(id), [] as Polemic[]),
    safe(listStocks(id), [] as StockHolding[]),
    safe(listRealEstate(id), [] as RealEstate[]),
    safe(listCompanies(id), [] as Company[]),
    safe(getSources(id), emptySources),
    safe(listElectoralHistory(id), [] as ElectoralHistoryItem[]),
    safe(listInterests(id), [] as Interest[]),
    safe(listEducation(id), [] as EducationItem[]),
    safe(listHonors(id), [] as Honor[]),
    safe(listKeyLegislation(id), [] as KeyLegislationItem[]),
    safe(listNetWorth(id), [] as NetWorthPoint[]),
    safe(listJustice(id), [] as JusticeCase[]),
  ]);

  const counts = tally(promises);
  const code = countryCodeOf(politician);
  const country = (code && countryName(code, lang)) || politician.country;
  const officeLabel = politician.office ? dict.office[politician.office] : null;
  // Profile text stays in the language it was written in; say which one when
  // it differs from the UI language.
  const contentLang = politician.content_lang ?? null;
  const contentLangName =
    contentLang && contentLang.split("-")[0] !== lang
      ? languageName(contentLang, lang)
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={localePath(lang)}
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {dict.politician.back}
      </Link>

      {/* Hero: identity + overall promise track record */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {politician.name}
        </h1>
        {(officeLabel || politician.role) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
            {officeLabel && (
              <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                {officeLabel}
              </span>
            )}
            {politician.role && (
              <span lang={contentLang ?? undefined}>{politician.role}</span>
            )}
          </p>
        )}
        <p className="mt-1 text-sm text-slate-500">
          {[politician.party, country].filter(Boolean).join(" · ")}
        </p>
        {contentLangName && (
          <p className="mt-3 inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
            {fmt(dict.politician.contentLanguage, { language: contentLangName })}
          </p>
        )}
        {politician.bio && (
          <p
            className="mt-3 text-sm leading-relaxed text-slate-600"
            lang={contentLang ?? undefined}
          >
            {politician.bio}
          </p>
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {dict.politician.trackRecord}
            </span>
            <span className="text-xs text-slate-500">
              {plural(dict.home.promiseCount, promises.length, lang)}
            </span>
          </div>
          <TrackRecord
            kept={counts.fulfilled}
            broken={counts.broken}
            inProgress={counts.in_progress}
            compromise={counts.compromise}
            noAction={counts.no_action}
            labels={dict.status}
            showLegend
          />
        </div>
      </div>

      {/* Tabbed, navigable profile (client) */}
      <PoliticianProfile
        dict={dict}
        lang={lang}
        politicianName={politician.name}
        countryCode={code}
        promises={promises}
        workHistory={workHistory}
        education={education}
        electoral={electoral}
        honors={honors}
        legislation={legislation}
        finances={finances}
        netWorth={netWorth}
        stocks={stocks}
        realEstate={realEstate}
        companies={companies}
        interests={interests}
        polemics={polemics}
        justice={justice}
        sources={sources}
      />
    </div>
  );
}

function tally(promises: PromiseWithVerification[]) {
  const counts: Record<VerificationStatus, number> = {
    fulfilled: 0,
    broken: 0,
    in_progress: 0,
    compromise: 0,
    no_action: 0,
  };
  for (const p of promises) {
    if (p.verification) counts[p.verification.status] += 1;
  }
  return counts;
}
