import { type ElectoralHistoryItem } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

/** Treat "n/a"-style placeholders as empty so context entries don't show "n/a". */
function clean(v: string | null): string | null {
  if (!v) return null;
  return v.trim().toLowerCase() === "n/a" ? null : v;
}

/** Electoral results list — result + vote share emphasised. */
export default function ElectoralHistory({
  items,
}: {
  items: ElectoralHistoryItem[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const result = clean(item.result);
        const share = clean(item.vote_share);
        const role = clean(item.role_sought);
        const opponent = clean(item.opponent);
        return (
          <li
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">{item.election}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  {role && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                      {role}
                    </span>
                  )}
                  {item.date && <span>{item.date}</span>}
                </p>
              </div>
              {result && (
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{result}</p>
                  {share && (
                    <p className="text-xs tabular-nums text-slate-500">{share}</p>
                  )}
                </div>
              )}
            </div>
            {opponent && (
              <p className="mt-2 text-xs text-slate-500">vs. {opponent}</p>
            )}
            {item.detail && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.detail}
              </p>
            )}
            <SourceLinks urls={item.source_urls} />
          </li>
        );
      })}
    </ul>
  );
}
