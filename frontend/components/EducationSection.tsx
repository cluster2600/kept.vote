import { type EducationItem } from "@/lib/api";
import SourceLinks from "@/components/SourceLinks";

/** Concise education list (detailed breakout; may overlap work-history). */
export default function EducationSection({
  items,
}: {
  items: EducationItem[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="font-semibold text-slate-900">{item.institution}</h3>
            {item.years && (
              <span className="text-xs tabular-nums text-slate-500">
                {item.years}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-600">
            {[item.qualification, item.field].filter(Boolean).join(" · ")}
          </p>
          {item.detail && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {item.detail}
            </p>
          )}
          <SourceLinks urls={item.source_urls} />
        </li>
      ))}
    </ul>
  );
}
