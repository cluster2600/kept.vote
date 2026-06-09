import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
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
  type WorkHistoryItem,
} from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import TrackRecord from "@/components/TrackRecord";
import WorkHistoryTimeline from "@/components/WorkHistoryTimeline";
import FinancesSection from "@/components/FinancesSection";
import FinanceSubSection, {
  type AssetItem,
} from "@/components/FinanceSubSection";
import PolemicsSection from "@/components/PolemicsSection";
import SourcesSection from "@/components/SourcesSection";
import ElectoralHistory from "@/components/ElectoralHistory";
import EducationSection from "@/components/EducationSection";
import HonorsSection from "@/components/HonorsSection";
import KeyLegislationSection from "@/components/KeyLegislationSection";
import NetWorthTimeline from "@/components/NetWorthTimeline";

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

  const hasFinances =
    finances.length > 0 ||
    stocks.length > 0 ||
    realEstate.length > 0 ||
    companies.length > 0 ||
    netWorth.length > 0;

  const counts = tally(promises);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← All politicians
      </Link>

      {/* Header */}
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
              Track record
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

      {/* Electoral history (near the top of the profile) */}
      {electoral.length > 0 && (
        <section>
          <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">
            Electoral history
          </h2>
          <ElectoralHistory items={electoral} />
        </section>
      )}

      {/* Promises */}
      <h2 className="mb-3 mt-10 text-lg font-semibold text-slate-900">
        Promises
      </h2>
      {promises.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          No promises recorded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {promises.map((promise) => (
            <li key={promise.id}>
              <PromiseRow promise={promise} />
            </li>
          ))}
        </ul>
      )}

      {/* Work history */}
      {workHistory.length > 0 && (
        <section>
          <h2 className="mb-4 mt-10 text-lg font-semibold text-slate-900">
            Work history
          </h2>
          <WorkHistoryTimeline items={workHistory} />
        </section>
      )}

      {/* Education (detailed breakout, near work history) */}
      {education.length > 0 && (
        <section>
          <h2 className="mb-4 mt-10 text-lg font-semibold text-slate-900">
            Education
          </h2>
          <EducationSection items={education} />
        </section>
      )}

      {/* Key legislation */}
      {legislation.length > 0 && (
        <section>
          <h2 className="mb-4 mt-10 text-lg font-semibold text-slate-900">
            Key legislation
          </h2>
          <KeyLegislationSection items={legislation} />
        </section>
      )}

      {/* Declared finances (+ net-worth timeline & asset sub-sections) */}
      {hasFinances && (
        <section>
          <h2 className="mb-4 mt-10 text-lg font-semibold text-slate-900">
            Declared finances
          </h2>
          <FinancesSection items={finances} />
          {netWorth.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Net Worth Timeline
              </h3>
              <NetWorthTimeline items={netWorth} />
            </div>
          )}
          <FinanceSubSection
            title="Securities / Stock Holdings"
            items={stocks.map(mapStock)}
          />
          <FinanceSubSection
            title="Real Estate"
            items={realEstate.map(mapRealEstate)}
          />
          <FinanceSubSection
            title="Companies & Ownership"
            items={companies.map(mapCompany)}
          />
        </section>
      )}

      {/* Declaration of interests (near finances) */}
      {interests.length > 0 && (
        <section>
          <h2 className="mb-4 mt-10 text-lg font-semibold text-slate-900">
            Declaration of interests
          </h2>
          <FinanceSubSection items={interests.map(mapInterest)} />
        </section>
      )}

      {/* Controversies */}
      {polemics.length > 0 && (
        <section>
          <h2 className="mb-4 mt-10 text-lg font-semibold text-slate-900">
            Controversies
          </h2>
          <PolemicsSection items={polemics} />
        </section>
      )}

      {/* Honors & distinctions */}
      {honors.length > 0 && (
        <section>
          <h2 className="mb-4 mt-10 text-lg font-semibold text-slate-900">
            Honors &amp; distinctions
          </h2>
          <HonorsSection items={honors} />
        </section>
      )}

      {/* Consolidated sources & references */}
      <SourcesSection data={sources} />
    </div>
  );
}

function PromiseRow({ promise }: { promise: PromiseWithVerification }) {
  const v = promise.verification;
  const date = formatDate(promise.date_made);
  return (
    <Link
      href={`/promises/${promise.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{promise.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            {promise.category && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                {promise.category}
              </span>
            )}
            {date && <span>Promised {date}</span>}
          </p>
          {promise.description && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
              {promise.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={v?.status ?? null} />
          {v && (
            <span className="text-xs tabular-nums text-slate-400">
              {Math.round(v.confidence_score * 100)}% confidence
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function tally(promises: PromiseWithVerification[]) {
  const counts = {
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

/** Humanize a snake_case enum-ish string for display (e.g. none_declared). */
function humanize(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/_/g, " ");
}

function joinMeta(parts: (string | null)[]): string | null {
  const kept = parts.filter(Boolean);
  return kept.length ? kept.join(" · ") : null;
}

// --- Normalize each asset dataset onto the shared AssetItem shape ----------
function mapStock(s: StockHolding): AssetItem {
  return {
    id: s.id,
    heading: s.holding,
    subtitle: humanize(s.type),
    value: s.value,
    meta: s.as_of ? `as of ${s.as_of}` : null,
    detail: s.detail,
    status: s.status,
    source_urls: s.source_urls,
  };
}

function mapRealEstate(r: RealEstate): AssetItem {
  return {
    id: r.id,
    heading: r.property,
    subtitle: r.location,
    value: r.value,
    meta: joinMeta([humanize(r.transaction_type), r.date]),
    detail: r.detail,
    status: r.status,
    source_urls: r.source_urls,
  };
}

function mapCompany(c: Company): AssetItem {
  return {
    id: c.id,
    heading: c.entity,
    subtitle: humanize(c.role),
    value: c.ownership_stake,
    meta: c.period,
    detail: c.detail,
    status: c.status,
    source_urls: c.source_urls,
  };
}

function mapInterest(i: Interest): AssetItem {
  // Drop placeholder "n/a" values so they don't render as a headline figure;
  // the status badge (e.g. "None declared") carries the meaning instead.
  const value =
    i.value && i.value.trim().toLowerCase() !== "n/a" ? i.value : null;
  return {
    id: i.id,
    heading: i.item,
    subtitle: humanize(i.type),
    value,
    meta: i.period,
    detail: i.detail,
    status: i.status,
    source_urls: i.source_urls,
  };
}
