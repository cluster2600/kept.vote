import { assetStatusMeta } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

export interface AssetItem {
  id: string;
  heading: string;
  subtitle: string | null;
  value: string | null;
  meta: string | null;
  detail: string | null;
  status: string | null;
  source_urls: string[] | null;
}

/** A labelled sub-section of declared-asset items (stocks, real estate, …).
 *  The status is shown prominently so an explicit "None declared" reads as a
 *  deliberate declaration rather than missing data. */
export default function FinanceSubSection({
  title,
  items,
}: {
  title?: string;
  items: AssetItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className={title ? "mt-6" : ""}>
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      )}
      <ul className="space-y-3">
        {items.map((item) => {
          const meta = assetStatusMeta(item.status);
          return (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{item.heading}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    {item.subtitle && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                        {item.subtitle}
                      </span>
                    )}
                    {item.meta && <span>{item.meta}</span>}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
                  title="Declaration status"
                >
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
                  {meta.label}
                </span>
              </div>

              {item.value && (
                <p className="mt-2 text-base font-semibold tracking-tight text-slate-900">
                  {item.value}
                </p>
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
    </div>
  );
}
