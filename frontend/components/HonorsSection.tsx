import { type Honor } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

/** Drop "n/a" placeholders so a "none verified" entry doesn't show stray n/a. */
function clean(v: string | null): string | null {
  if (!v) return null;
  return v.trim().toLowerCase() === "n/a" ? null : v;
}

/** Honours & distinctions. ``awarded_by`` (e.g. "Ex officio (French Republic)")
 *  and the detail are shown verbatim so office-attached or "not itemised"
 *  framing is preserved rather than implying a personally conferred award. */
export default function HonorsSection({ items }: { items: Honor[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const awardedBy = clean(item.awarded_by);
        const year = clean(item.year);
        const exOfficio = (awardedBy ?? "").toLowerCase().includes("ex officio");
        return (
          <li
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <h3 className="font-semibold text-slate-900">{item.honor}</h3>
              <div className="flex items-center gap-2">
                {exOfficio && (
                  <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                    Ex officio
                  </span>
                )}
                {year && (
                  <span className="text-xs tabular-nums text-slate-500">
                    {year}
                  </span>
                )}
              </div>
            </div>
            {awardedBy && (
              <p className="mt-0.5 text-sm text-slate-600">{awardedBy}</p>
            )}
            {item.detail && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
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
