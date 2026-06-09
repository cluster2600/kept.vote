import { type FinanceEntry } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

const TYPE_LABELS: Record<string, string> = {
  net_worth: "Net worth",
  assets: "Assets",
  income: "Income",
  real_estate: "Real estate",
};

function typeLabel(type: string | null): string | null {
  if (!type) return null;
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

/** Declared-finances cards. Figures are shown verbatim (label/amount/detail)
 *  so any "declared"/"approx." wording from the source data is preserved. */
export default function FinancesSection({ items }: { items: FinanceEntry[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        Figures are reproduced as declared — most are drawn from the official
        declarations filed with France&apos;s{" "}
        <abbr title="Haute Autorité pour la transparence de la vie publique">
          HATVP
        </abbr>{" "}
        (High Authority for Transparency in Public Life). Wording such as
        &ldquo;declared&rdquo; or &ldquo;approx.&rdquo; reflects the source and
        is shown unaltered.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              {typeLabel(item.type) && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {typeLabel(item.type)}
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
            <SourceLinks urls={item.source_urls} />
          </li>
        ))}
      </ul>
    </div>
  );
}
