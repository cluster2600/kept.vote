import { type SourcesResponse, type SourceRef } from "@/lib/api";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { fmt, plural } from "@/lib/i18n/format";
import type { I18nProps } from "@/lib/i18n/props";

function sectionLabel(key: string, dict: Dictionary): string {
  const labels: Record<string, string> = dict.sources.sections;
  return labels[key] ?? key.replace(/_/g, " ");
}

/** Turn a URL into a compact, readable label (path tail, or the host root). */
function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname).replace(/\/$/, "");
    if (!path || path === "") return u.hostname.replace(/^www\./, "");
    // Keep it short: last meaningful path segment(s).
    const segs = path.split("/").filter(Boolean);
    const tail = segs.slice(-2).join("/");
    return tail.length > 60 ? tail.slice(0, 57) + "…" : tail;
  } catch {
    return url;
  }
}

/** Consolidated, deduplicated list of every source backing the profile,
 *  grouped by domain. Complements (does not replace) per-item source links. */
export default function SourcesSection({
  data,
  countryCode,
  dict,
  lang,
}: {
  data: SourcesResponse;
  countryCode: string | null;
} & I18nProps) {
  if (data.total === 0) return null;

  // Group by domain, preserving the server's (domain, url) ordering.
  const byDomain = new Map<string, SourceRef[]>();
  for (const s of data.sources) {
    const list = byDomain.get(s.domain) ?? [];
    list.push(s);
    byDomain.set(s.domain, list);
  }
  // Domains with more sources first, then alphabetical.
  const domains = [...byDomain.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
  const t = dict.sources;
  const methodologySources =
    countryCode === "FR"
      ? t.methodologySources.france
      : countryCode === "CH"
        ? t.methodologySources.switzerland
        : t.methodologySources.default;

  return (
    <section>
      <div className="mb-1 mt-10 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{t.title}</h2>
        <span className="text-sm font-medium text-slate-500">
          {fmt(t.summary, {
            sources: plural(t.sourceCount, data.total, lang),
            domains: plural(t.domainCount, data.domain_count, lang),
          })}
        </span>
      </div>

      {/* Methodology */}
      <p className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        <span className="font-semibold text-slate-600">
          {t.methodologyLabel}
        </span>{" "}
        {methodologySources} {t.methodologyStatuses}
      </p>

      <div className="space-y-5">
        {domains.map(([domain, refs]) => (
          <div key={domain}>
            <h3 className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold text-slate-700">
              {domain || t.otherDomain}
              <span className="text-xs font-normal text-slate-400">
                {refs.length}
              </span>
            </h3>
            <ul className="space-y-1.5">
              {refs.map((s) => (
                <li key={s.url} className="text-sm">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-baseline gap-1.5 text-blue-600 hover:text-blue-700"
                  >
                    <span className="truncate">{linkLabel(s.url)}</span>
                    <span aria-hidden className="shrink-0">
                      ↗
                    </span>
                  </a>
                  <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                    {s.sections.map((sec) => (
                      <span
                        key={sec}
                        className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
                      >
                        {sectionLabel(sec, dict)}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
