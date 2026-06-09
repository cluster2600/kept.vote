import { assetStatusMeta, type NetWorthPoint } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

/** Declared-net-worth timeline (chronological). Overlaps the finance figures
 *  by design — presented here as a year-by-year trajectory with the HATVP
 *  notes shown verbatim. */
export default function NetWorthTimeline({
  items,
}: {
  items: NetWorthPoint[];
}) {
  if (items.length === 0) return null;
  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-6">
      {items.map((item) => {
        const meta = assetStatusMeta(item.status);
        return (
          <li key={item.id} className="relative">
            <span
              className="absolute -left-[1.65rem] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white"
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {item.year}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
                title="Declaration status"
              >
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
                {meta.label}
              </span>
            </div>
            {item.declared_net_worth && (
              <p className="mt-1 text-base font-semibold tracking-tight text-slate-900">
                {item.declared_net_worth}
              </p>
            )}
            {item.note && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {item.note}
              </p>
            )}
            <SourceLinks urls={item.source_urls} />
          </li>
        );
      })}
    </ol>
  );
}
