import { polemicStatusMeta, type Polemic } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

/** Controversies, presented neutrally. Description, key facts and the legal/
 *  political status are shown verbatim; the status badge is shown prominently
 *  so allegations are never presented as settled fact. */
export default function PolemicsSection({ items }: { items: Polemic[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        Each entry summarises a publicly documented controversy and shows its
        current legal or political status. Descriptions are factual and neutral;
        an allegation is not a finding of wrongdoing.
      </p>
      {items.map((item) => {
        const meta = polemicStatusMeta(item.status);
        return (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  {item.category && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                      {item.category}
                    </span>
                  )}
                  {item.period && <span>{item.period}</span>}
                </p>
              </div>
              {/* Status badge — shown prominently */}
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.badge}`}
              >
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
                {meta.label}
              </span>
            </div>

            {item.description && (
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {item.description}
              </p>
            )}

            {item.key_facts && item.key_facts.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Key facts
                </h4>
                <ul className="mt-1.5 space-y-1.5">
                  {item.key_facts.map((fact, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 text-sm leading-relaxed text-slate-600"
                    >
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                        aria-hidden
                      />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <SourceLinks urls={item.source_urls} />
          </article>
        );
      })}
    </div>
  );
}
