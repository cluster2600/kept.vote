import { type KeyLegislationItem } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

/** Landmark laws — area tag + year, description, and significance. */
export default function KeyLegislationSection({
  items,
}: {
  items: KeyLegislationItem[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="min-w-0 font-semibold text-slate-900">
              {item.law_name}
            </h3>
            <p className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
              {item.area && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                  {item.area}
                </span>
              )}
              {item.year && <span className="tabular-nums">{item.year}</span>}
            </p>
          </div>
          {item.description && (
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {item.description}
            </p>
          )}
          {item.significance && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <span className="font-medium text-slate-700">Significance: </span>
              {item.significance}
            </p>
          )}
          <SourceLinks urls={item.source_urls} />
        </li>
      ))}
    </ul>
  );
}
