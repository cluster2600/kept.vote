import { prettyDate, type WorkHistoryItem } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

/** A vertical, reverse-chronological career timeline. */
export default function WorkHistoryTimeline({
  items,
}: {
  items: WorkHistoryItem[];
}) {
  if (items.length === 0) return null;
  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6">
      {items.map((item) => {
        const start = prettyDate(item.start_date);
        const end = prettyDate(item.end_date);
        const range = [start, end].filter(Boolean).join(" – ");
        const ongoing = (item.end_date ?? "").toLowerCase() === "present";
        return (
          <li key={item.id} className="relative">
            {/* node */}
            <span
              className={`absolute -left-[1.65rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                ongoing ? "bg-blue-600" : "bg-slate-300"
              }`}
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="font-semibold text-slate-900">{item.role}</h3>
              {range && (
                <span className="text-xs tabular-nums text-slate-500">
                  {range}
                </span>
              )}
            </div>
            {item.organization && (
              <p className="text-sm font-medium text-slate-600">
                {item.organization}
              </p>
            )}
            {item.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            )}
            <SourceLinks urls={item.source_urls} />
          </li>
        );
      })}
    </ol>
  );
}
