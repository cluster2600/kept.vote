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
  let politician: Politician;
  let promises: PromiseWithVerification[];
  let workHistory: WorkHistoryItem[];
  let finances: FinanceEntry[];
  let polemics: Polemic[];
  let stocks: StockHolding[];
  let realEstate: RealEstate[];
  let companies: Company[];
  let sources: SourcesResponse;
  let electoral: ElectoralHistoryItem[];
  let interests: Interest[];
  let education: EducationItem[];
  let honors: Honor[];
  let legislation: KeyLegislationItem[];
  let netWorth: NetWorthPoint[];
  try {
    [
      politician,
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
    ] = await Promise.all([
      getPolitician(params.id),
      listPoliticianPromises(params.id),
      listWorkHistory(params.id),
      listFinances(params.id),
      listPolemics(params.id),
      listStocks(params.id),
      listRealEstate(params.id),
      listCompanies(params.id),
      getSources(params.id),
      listElectoralHistory(params.id),
      listInterests(params.id),
      listEducation(params.id),
      listHonors(params.id),
      listKeyLegislation(params.id),
      listNetWorth(params.id),
    ]);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

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
