import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  countryCodeOf,
  type PoliticianSummary,
  type SystemStatus,
} from "@/lib/api";
import {
  getStatus,
  listPoliticians,
} from "@/lib/data";
import TrackRecord from "@/components/TrackRecord";
import { getDictionary, type Dictionary } from "./dictionaries";
import { intlLocale, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { countryName, plural } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ country?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? { alternates: alternatesFor(lang, "/") } : {};
}

interface CountryGroup {
  /** ISO code, or "" for politicians without a known country. */
  code: string;
  name: string;
  politicians: PoliticianSummary[];
}

/** Group politicians by country, sorted by localized country name, with the
 *  unknown-country group last. */
function groupByCountry(
  politicians: PoliticianSummary[],
  lang: Locale,
  dict: Dictionary,
): CountryGroup[] {
  const groups = new Map<string, CountryGroup>();
  for (const p of politicians) {
    const code = countryCodeOf(p) ?? "";
    let group = groups.get(code);
    if (!group) {
      const name =
        (code && countryName(code, lang)) || p.country || dict.home.otherCountry;
      group = { code, name, politicians: [] };
      groups.set(code, group);
    }
    group.politicians.push(p);
  }
  const collator = new Intl.Collator(intlLocale(lang));
  return [...groups.values()].sort((a, b) =>
    a.code === "" ? 1 : b.code === "" ? -1 : collator.compare(a.name, b.name),
  );
}

export default async function HomePage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.home;

  let politicians: PoliticianSummary[] = [];
  let stats: SystemStatus | null = null;
  let error: string | null = null;

  try {
    [politicians, stats] = await Promise.all([listPoliticians(), getStatus()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  const groups = groupByCountry(politicians, lang, dict);
  const requested = (await searchParams).country;
  const selected =
    typeof requested === "string" ? requested.toUpperCase() : null;
  const visibleGroups = selected
    ? groups.filter((g) => g.code === selected)
    : groups;

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="py-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {t.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          {t.intro}
        </p>

        {stats && (
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <Stat label={t.stats.politicians} value={stats.politicians} lang={lang} />
            <Stat label={t.stats.promises} value={stats.promises} lang={lang} />
            <Stat label={t.stats.verified} value={stats.verifications} lang={lang} />
          </dl>
        )}
      </section>

      {/* Politicians */}
      <section className="pb-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {t.politiciansHeading}
        </h2>

        {error ? (
          <ConnectionError message={error} dict={dict} />
        ) : politicians.length === 0 ? (
          <EmptyState dict={dict} />
        ) : (
          <>
            {groups.length > 1 && (
              <CountryFilter
                groups={groups}
                selected={selected}
                total={politicians.length}
                lang={lang}
                dict={dict}
              />
            )}
            {visibleGroups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
                {t.noneInCountry}
              </p>
            ) : (
              <div className="space-y-10">
                {visibleGroups.map((g) => (
                  <section key={g.code || "other"} aria-labelledby={`country-${g.code || "other"}`}>
                    <h3
                      id={`country-${g.code || "other"}`}
                      className="mb-3 flex items-baseline gap-2 text-base font-semibold text-slate-900"
                    >
                      {g.name}
                      <span className="text-sm font-normal text-slate-400">
                        {plural(t.politicianCount, g.politicians.length, lang)}
                      </span>
                    </h3>
                    <ul className="grid gap-4 sm:grid-cols-2">
                      {g.politicians.map((p) => (
                        <li key={p.id}>
                          <PoliticianCard politician={p} lang={lang} dict={dict} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, lang }: { label: string; value: number; lang: Locale }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-3xl font-bold tabular-nums text-slate-900">
        {new Intl.NumberFormat(intlLocale(lang)).format(value)}
      </dd>
    </div>
  );
}

/** Country chips as plain links (?country=XX), so filtering works without
 *  JavaScript and a filtered view can be shared. */
function CountryFilter({
  groups,
  selected,
  total,
  lang,
  dict,
}: {
  groups: CountryGroup[];
  selected: string | null;
  total: number;
  lang: Locale;
  dict: Dictionary;
}) {
  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      active
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
    }`;
  const count = (active: boolean) =>
    `tabular-nums ${active ? "text-white/70" : "text-slate-400"}`;
  return (
    <nav aria-label={dict.home.countryFilterLabel} className="mb-6">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={localePath(lang)}
            className={chip(!selected)}
            aria-current={!selected ? "page" : undefined}
          >
            {dict.home.allCountries}
            <span className={count(!selected)}>{total}</span>
          </Link>
        </li>
        {groups
          .filter((g) => g.code)
          .map((g) => {
            const active = selected === g.code;
            return (
              <li key={g.code}>
                <Link
                  href={`${localePath(lang)}?country=${g.code}`}
                  className={chip(active)}
                  aria-current={active ? "page" : undefined}
                >
                  {g.name}
                  <span className={count(active)}>{g.politicians.length}</span>
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}

function PoliticianCard({
  politician: p,
  lang,
  dict,
}: {
  politician: PoliticianSummary;
  lang: Locale;
  dict: Dictionary;
}) {
  const t = dict.home;
  const officeLabel = p.office ? dict.office[p.office] : null;
  // Promise-driven: politicians with no tracked promises (e.g. technocrat
  // ministers) read as a profile/dossier, not an empty promise tracker — so
  // skip the "0 promises" badge and the empty track-record bar entirely.
  const hasPromises = p.promise_count > 0;
  const verified =
    p.kept_count +
    p.broken_count +
    p.in_progress_count +
    p.compromise_count +
    p.no_action_count;
  return (
    <Link
      href={localePath(lang, `/politicians/${p.id}`)}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
          {(officeLabel || p.role) && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              {officeLabel && (
                <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                  {officeLabel}
                </span>
              )}
              {p.role && <span lang={p.content_lang ?? undefined}>{p.role}</span>}
            </p>
          )}
          {p.party && <p className="mt-0.5 text-sm text-slate-500">{p.party}</p>}
        </div>
        {hasPromises ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {plural(t.promiseCount, p.promise_count, lang)}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            {t.profileBadge}
          </span>
        )}
      </div>

      {hasPromises ? (
        <div className="mt-4">
          <TrackRecord
            kept={p.kept_count}
            broken={p.broken_count}
            inProgress={p.in_progress_count}
            compromise={p.compromise_count}
            noAction={p.no_action_count}
            labels={dict.status}
            showLegend
          />
          {verified === 0 && (
            <p className="mt-2 text-xs text-slate-400">{t.noVerifiedYet}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500">
          {t.viewDossier}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
              clipRule="evenodd"
            />
          </svg>
        </p>
      )}
    </Link>
  );
}

function EmptyState({ dict }: { dict: Dictionary }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">{dict.home.emptyState}</p>
      <code className="mt-2 inline-block rounded-sm bg-slate-100 px-2 py-1 text-xs text-slate-700">
        python seed.py
      </code>
    </div>
  );
}

function ConnectionError({ message, dict }: { message: string; dict: Dictionary }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
      <p className="text-sm font-medium text-rose-800">
        {dict.home.connectionErrorTitle}
      </p>
      <p className="mt-1 text-sm text-rose-700">
        {dict.home.connectionErrorBody}
      </p>
      <p className="mt-2 break-all text-xs text-rose-500">{message}</p>
    </div>
  );
}
