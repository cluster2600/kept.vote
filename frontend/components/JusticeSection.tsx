import { justiceStatusMeta, type JusticeCase } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

/** Justice / legal record, presented neutrally. Each case shows a prominent
 *  status badge (convicted / acquitted / dismissed / ongoing / appeal-pending /
 *  …), the case title, period and court, a neutral description, key facts, and
 *  — verbatim — the presumption-of-innocence note. An allegation or an ongoing
 *  matter is never presented as a finding of guilt. */
export default function JusticeSection({ items }: { items: JusticeCase[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        Each entry documents a judicial matter and its current legal status.
        Investigations and pending matters are not findings of wrongdoing; the
        presumption of innocence applies until a final court decision.
      </p>
      {items.map((item) => {
        const meta = justiceStatusMeta(item.status);
        const meta_in = [
          item.type && titleCase(item.type),
          item.period,
          item.court,
        ].filter(Boolean) as string[];
        return (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">
                  {item.case_title}
                </h3>
                {meta_in.length > 0 && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    {meta_in.map((part, i) => (
                      <span key={i}>
                        {i > 0 && <span className="mr-2 text-slate-300">·</span>}
                        {part}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              {/* Status badge — shown prominently */}
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.badge}`}
              >
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
                {meta.label}
              </span>
            </div>

            {item.outcome && (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-600">Outcome: </span>
                {item.outcome}
              </p>
            )}

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

            {/* Presumption-of-innocence note — verbatim, never paraphrased. */}
            {item.presumption_note && (
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                {item.presumption_note}
              </p>
            )}

            <SourceLinks urls={item.source_urls} />
          </article>
        );
      })}
    </div>
  );
}

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
