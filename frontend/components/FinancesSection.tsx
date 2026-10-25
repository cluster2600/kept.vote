import { type FinanceEntry } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { I18nProps } from "@/lib/i18n/props";

function typeLabel(type: string | null, dict: Dictionary): string | null {
  if (!type) return null;
  const labels: Record<string, string> = dict.finances.types;
  return labels[type] ?? type.replace(/_/g, " ");
}

/** Declared-finances cards. Figures are shown verbatim (label/amount/detail)
 *  so any "declared"/"approx." wording from the source data is preserved. */
export default function FinancesSection({
  items,
  dict,
  lang,
}: { items: FinanceEntry[] } & I18nProps) {
  if (items.length === 0) return null;
  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              {typeLabel(item.type, dict) && (
                <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {typeLabel(item.type, dict)}
                </span>
              )}
              {item.year_or_period && (
                <span className="text-xs tabular-nums text-slate-400">
                  {item.year_or_period}
                </span>
              )}
            </div>
            {item.label && (
              <p className="mt-2 text-sm font-medium text-slate-700">
                {item.label}
              </p>
            )}
            {item.amount && (
              <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                {item.amount}
              </p>
            )}
            {item.detail && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.detail}
              </p>
            )}
            <SourceLinks urls={item.source_urls} dict={dict} lang={lang} />
          </li>
        ))}
      </ul>
    </div>
  );
}
