import Link from "next/link";
import { notFound } from "next/navigation";
import {
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
import PoliticianTabs from "@/components/PoliticianTabs";

export const dynamic = "force-dynamic";

export default async function PoliticianPage({
  params,
}: {
  params: { id: string };
}) {
  // The core politician record is the only thing whose absence means "no such
  // page": a 404 here is a genuine not-found → render the 404 page.
  let politician: Politician;
  try {
    politician = await getPolitician(params.id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  // Profile sections are resilient. A single section endpoint that 404s (e.g.
  // the justice route before it's deployed), 500s, or errors transiently must
  // NEVER blank the whole page — degrade it to empty and still render the rest.
  const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
    p.catch((err) => {
      console.error(`[politician ${params.id}] section fetch failed:`, err);
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
    safe(listPoliticianPromises(params.id), [] as PromiseWithVerification[]),
    safe(listWorkHistory(params.id), [] as WorkHistoryItem[]),
    safe(listFinances(params.id), [] as FinanceEntry[]),
    safe(listPolemics(params.id), [] as Polemic[]),
    safe(listStocks(params.id), [] as StockHolding[]),
    safe(listRealEstate(params.id), [] as RealEstate[]),
    safe(listCompanies(params.id), [] as Company[]),
    safe(getSources(params.id), emptySources),
    safe(listElectoralHistory(params.id), [] as ElectoralHistoryItem[]),
    safe(listInterests(params.id), [] as Interest[]),
    safe(listEducation(params.id), [] as EducationItem[]),
    safe(listHonors(params.id), [] as Honor[]),
    safe(listKeyLegislation(params.id), [] as KeyLegislationItem[]),
    safe(listNetWorth(params.id), [] as NetWorthPoint[]),
    safe(listJustice(params.id), [] as JusticeCase[]),
  ]);

  const counts = tally(promises);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← All politicians
      </Link>

      {/* Hero: identity + overall promise track record */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {politician.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {[politician.party, politician.country].filter(Boolean).join(" · ")}
        </p>
        {politician.bio && (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {politician.bio}
          </p>
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Promise track record
            </span>
            <span className="text-xs text-slate-500">
              {promises.length} promise{promises.length === 1 ? "" : "s"}
            </span>
          </div>
          <TrackRecord
            kept={counts.fulfilled}
            broken={counts.broken}
            inProgress={counts.in_progress}
            compromise={counts.compromise}
            noAction={counts.no_action}
            showLegend
          />
        </div>
      </div>

      {/* Tabbed, navigable profile (client) */}
      <PoliticianTabs
        politicianName={politician.name}
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
