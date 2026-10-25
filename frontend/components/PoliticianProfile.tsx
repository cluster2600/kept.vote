import { type ReactNode } from "react";
import type {
  Company,
  EducationItem,
  ElectoralHistoryItem,
  FinanceEntry,
  Honor,
  Interest,
  JusticeCase,
  KeyLegislationItem,
  NetWorthPoint,
  Polemic,
  PromiseWithVerification,
  RealEstate,
  SourcesResponse,
  StockHolding,
  WorkHistoryItem,
} from "@/lib/api";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { fmt, formatDate, formatPercent, rich } from "@/lib/i18n/format";
import type { I18nProps } from "@/lib/i18n/props";
import { type AssetItem } from "@/components/FinanceSubSection";
import FinanceSubSection from "@/components/FinanceSubSection";
import FinanceDisclaimer from "@/components/FinanceDisclaimer";
import FinancesSection from "@/components/FinancesSection";
import NetWorthTimeline from "@/components/NetWorthTimeline";
import WorkHistoryTimeline from "@/components/WorkHistoryTimeline";
import EducationSection from "@/components/EducationSection";
import ElectoralHistory from "@/components/ElectoralHistory";
import KeyLegislationSection from "@/components/KeyLegislationSection";
import HonorsSection from "@/components/HonorsSection";
import PolemicsSection from "@/components/PolemicsSection";
import JusticeSection from "@/components/JusticeSection";
import SourcesSection from "@/components/SourcesSection";
import PromisesTab, { type PromiseView } from "@/components/PromisesTab";
import PoliticianTabs, { type TabDef } from "@/components/PoliticianTabs";

export interface PoliticianProfileProps extends I18nProps {
  politicianName: string;
  countryCode: string | null;
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
  justice: JusticeCase[];
  sources: SourcesResponse;
}

type TabKey =
  | "promises"
  | "background"
  | "finances"
  | "justice"
  | "controversies"
  | "sources";

/** Server-side composition of a politician's tabbed profile: computes tab
 *  counts, renders every panel with the active locale, and hands them to the
 *  client tab shell. */
export default function PoliticianProfile(props: PoliticianProfileProps) {
  const {
    dict,
    lang,
    politicianName,
    countryCode,
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
    justice,
    sources,
  } = props;
  const i18n = { dict, lang };
  const tabLabels = dict.politician.tabs;

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

  const allTabs: (TabDef & { key: TabKey })[] = [
    { key: "promises", label: tabLabels.promises, count: promises.length },
    { key: "background", label: tabLabels.background, count: backgroundCount },
    { key: "finances", label: tabLabels.finances, count: financesCount },
    { key: "justice", label: tabLabels.justice, count: justice.length },
    { key: "controversies", label: tabLabels.controversies, count: polemics.length },
    { key: "sources", label: tabLabels.sources, count: sources.total },
  ];
  // Promise-driven: only surface the Promises tab when there are promises to
  // track. Technocrat ministers (0 promises) get a clean dossier that opens on
  // their richest section (Background, first in order) rather than leading with
  // an empty "No promises" card. Any politician who later gains campaign pledges
  // gets the tab — and the Promises-first default — back automatically.
  const tabs = allTabs.filter((t) =>
    t.key === "promises" ? hasPromises : t.count > 0,
  );
  const shown = new Set(tabs.map((t) => t.key));

  const bg = dict.politician.background;
  const f = dict.finances;
  const panels: Partial<Record<TabKey, ReactNode>> = {};

  if (shown.has("promises")) {
    panels.promises = (
      <PromisesTab
        promises={promises.map((p) => toPromiseView(p, dict, lang))}
        lang={lang}
        labels={{
          status: dict.status,
          all: dict.promises.all,
          otherCategory: dict.promises.otherCategory,
          filteredCount: dict.promises.filteredCount,
          filterLabel: dict.promises.filterLabel,
        }}
        emptyState={<NoPromises name={politicianName} dict={dict} />}
        campaignNotice={<CampaignNotice name={politicianName} dict={dict} />}
      />
    );
  }

  if (shown.has("background")) {
    panels.background = (
      <div className="space-y-10">
        <Sub title={bg.electoral} show={electoral.length > 0}>
          <ElectoralHistory items={electoral} {...i18n} />
        </Sub>
        <Sub title={bg.work} show={workHistory.length > 0}>
          <WorkHistoryTimeline items={workHistory} {...i18n} />
        </Sub>
        <Sub title={bg.education} show={education.length > 0}>
          <EducationSection items={education} {...i18n} />
        </Sub>
        <Sub title={bg.legislation} show={legislation.length > 0}>
          <KeyLegislationSection items={legislation} {...i18n} />
        </Sub>
        <Sub title={bg.honors} show={honors.length > 0}>
          <HonorsSection items={honors} {...i18n} />
        </Sub>
      </div>
    );
  }

  if (shown.has("finances")) {
    panels.finances = (
      <div>
        <FinanceDisclaimer countryCode={countryCode} dict={dict} />
        <FinancesSection items={finances} {...i18n} />
        {netWorth.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {f.netWorthTimeline}
            </h3>
            <NetWorthTimeline items={netWorth} {...i18n} />
          </div>
        )}
        <FinanceSubSection
          title={f.stocks}
          items={stocks.map((s) => mapStock(s, dict))}
          {...i18n}
        />
        <FinanceSubSection
          title={f.realEstate}
          items={realEstate.map(mapRealEstate)}
          {...i18n}
        />
        <FinanceSubSection
          title={f.companies}
          items={companies.map(mapCompany)}
          {...i18n}
        />
        {interests.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {f.interests}
            </h3>
            <FinanceSubSection items={interests.map(mapInterest)} {...i18n} />
          </div>
        )}
      </div>
    );
  }

  if (shown.has("justice")) {
    panels.justice = <JusticeSection items={justice} {...i18n} />;
  }
  if (shown.has("controversies")) {
    panels.controversies = <PolemicsSection items={polemics} {...i18n} />;
  }
  if (shown.has("sources")) {
    panels.sources = (
      <SourcesSection data={sources} countryCode={countryCode} {...i18n} />
    );
  }

  return (
    <PoliticianTabs
      tabs={tabs}
      panels={panels}
      ariaLabel={dict.politician.tabsLabel}
    />
  );
}

/** Attach the locale-formatted strings a promise row shows. */
function toPromiseView(
  p: PromiseWithVerification,
  dict: Dictionary,
  lang: string,
): PromiseView {
  const date = formatDate(p.date_made, lang);
  return {
    ...p,
    dateLabel: date ? fmt(dict.promises.promised, { date }) : null,
    confidenceLabel: p.verification
      ? fmt(dict.promises.confidenceValue, {
          value: formatPercent(p.verification.confidence_score, lang),
        })
      : null,
  };
}

function NoPromises({ name, dict }: { name: string; dict: Dictionary }) {
  const tabs = dict.politician.tabs;
  const strong = (text: string) => <span className="font-medium">{text}</span>;
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm leading-relaxed text-slate-600">
      <p className="font-semibold text-slate-700">{dict.promises.emptyTitle}</p>
      <p className="mt-1.5">
        {rich(dict.promises.emptyBody, {
          name,
          background: strong(tabs.background),
          legislation: strong(dict.politician.background.legislation),
          controversies: strong(tabs.controversies),
        })}
      </p>
    </div>
  );
}

function CampaignNotice({ name, dict }: { name: string; dict: Dictionary }) {
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
      <span className="font-semibold text-slate-700">
        {dict.promises.contextLabel}
      </span>{" "}
      {rich(dict.promises.campaignOnly, {
        name,
        noAction: <span className="font-medium">{dict.status.no_action}</span>,
      })}
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

function mapStock(s: StockHolding, dict: Dictionary): AssetItem {
  return {
    id: s.id,
    heading: s.holding,
    subtitle: humanize(s.type),
    value: s.value,
    meta: s.as_of ? fmt(dict.finances.asOf, { date: s.as_of }) : null,
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
