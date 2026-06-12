"use client";

import { useState, type ReactNode } from "react";
import type {
  Company,
  EducationItem,
  ElectoralHistoryItem,
  FinanceEntry,
  Honor,
  Interest,
  KeyLegislationItem,
  NetWorthPoint,
  Polemic,
  PromiseWithVerification,
  RealEstate,
  SourcesResponse,
  StockHolding,
  WorkHistoryItem,
} from "@/lib/api";
import { type AssetItem } from "@/components/FinanceSubSection";
import FinanceSubSection from "@/components/FinanceSubSection";
import FinancesSection from "@/components/FinancesSection";
import NetWorthTimeline from "@/components/NetWorthTimeline";
import WorkHistoryTimeline from "@/components/WorkHistoryTimeline";
import EducationSection from "@/components/EducationSection";
import ElectoralHistory from "@/components/ElectoralHistory";
import KeyLegislationSection from "@/components/KeyLegislationSection";
import HonorsSection from "@/components/HonorsSection";
import PolemicsSection from "@/components/PolemicsSection";
import SourcesSection from "@/components/SourcesSection";
import PromisesTab from "@/components/PromisesTab";

export interface PoliticianTabsProps {
  politicianName: string;
  promises: PromiseWithVerification[];
  workHistory: WorkHistoryItem[];
  education: EducationItem[];
  electoral: ElectoralHistoryItem[];
  honors: Honor[];
  legislation: KeyLegislationItem[];
  finances: FinanceEntry[];
  netWorth: NetWorthPoint[];
  stocks: StockHolding[];
  realEstate: RealEstate[];
  companies: Company[];
  interests: Interest[];
  polemics: Polemic[];
  sources: SourcesResponse;
}

type TabKey =
  | "promises"
  | "background"
  | "finances"
  | "controversies"
  | "sources";

export default function PoliticianTabs(props: PoliticianTabsProps) {
  const {
    politicianName,
    promises,
    workHistory,
    education,
    electoral,
    honors,
    legislation,
    finances,
    netWorth,
    stocks,
    realEstate,
    companies,
    interests,
    polemics,
    sources,
  } = props;

  const backgroundCount =
    workHistory.length +
    education.length +
    electoral.length +
    legislation.length +
    honors.length;
  const financesCount =
    finances.length +
    netWorth.length +
    stocks.length +
    realEstate.length +
    companies.length +
    interests.length;

  const hasPromises = promises.length > 0;

  const allTabs: { key: TabKey; label: string; count: number }[] = [
    { key: "promises", label: "Promises", count: promises.length },
    { key: "background", label: "Background", count: backgroundCount },
    { key: "finances", label: "Finances", count: financesCount },
    { key: "controversies", label: "Controversies", count: polemics.length },
    { key: "sources", label: "Sources", count: sources.total },
  ];
  // Promise-driven: only surface the Promises tab when there are promises to
  // track. Technocrat ministers (0 promises) get a clean dossier that opens on
  // their richest section (Background, first in order) rather than leading with
  // an empty "No promises" card. Any politician who later gains campaign pledges
  // gets the tab — and the Promises-first default — back automatically.
  const tabs = allTabs.filter((t) =>
    t.key === "promises" ? hasPromises : t.count > 0,
  );

  const [active, setActive] = useState<TabKey>(tabs[0]?.key ?? "background");

  return (
    <div className="mt-6">
      {/* Sticky tab bar — scrolls horizontally on small screens. */}
      <div className="sticky top-[60px] z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur">
        <nav
          className="flex gap-1 overflow-x-auto"
          aria-label="Profile sections"
        >
          {tabs.map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                aria-current={isActive ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "border-blue-600 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6">
        {active === "promises" && (
          <PromisesTab promises={promises} politicianName={politicianName} />
        )}

        {active === "background" && (
          <div className="space-y-10">
            <Sub title="Electoral history" show={electoral.length > 0}>
              <ElectoralHistory items={electoral} />
            </Sub>
            <Sub title="Work history" show={workHistory.length > 0}>
              <WorkHistoryTimeline items={workHistory} />
            </Sub>
            <Sub title="Education" show={education.length > 0}>
              <EducationSection items={education} />
            </Sub>
            <Sub title="Key legislation" show={legislation.length > 0}>
              <KeyLegislationSection items={legislation} />
            </Sub>
            <Sub title="Honors & distinctions" show={honors.length > 0}>
              <HonorsSection items={honors} />
            </Sub>
          </div>
        )}

        {active === "finances" && (
          <div>
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
            {interests.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Declaration of interests
                </h3>
                <FinanceSubSection items={interests.map(mapInterest)} />
              </div>
            )}
          </div>
        )}

        {active === "controversies" && <PolemicsSection items={polemics} />}

        {active === "sources" && <SourcesSection data={sources} />}
      </div>
    </div>
  );
}

function Sub({
  title,
  show,
  children,
}: {
  title: string;
  show: boolean;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

// --- Asset normalizers (shared AssetItem shape) ----------------------------
function humanize(value: string | null): string | null {
  return value ? value.replace(/_/g, " ") : null;
}

function joinMeta(parts: (string | null)[]): string | null {
  const kept = parts.filter(Boolean);
  return kept.length ? kept.join(" · ") : null;
}

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
