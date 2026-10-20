import type { Dictionary } from "@/app/[lang]/dictionaries";
import { rich } from "@/lib/i18n/format";

/** Footer with a short methodology / credibility note. */
export default function SiteFooter({ dict }: { dict: Dictionary }) {
  const s = dict.status;
  return (
    <footer
      id="methodology"
      className="mt-16 border-t border-slate-200 bg-slate-50"
    >
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">
          {dict.footer.methodologyTitle}
        </h2>
        <p className="mt-2 max-w-2xl leading-relaxed">
          {rich(dict.footer.methodologyBody, {
            kept: <em>{s.fulfilled}</em>,
            broken: <em>{s.broken}</em>,
            inProgress: <em>{s.in_progress}</em>,
            noAction: <em>{s.no_action}</em>,
          })}
        </p>
        <p className="mt-4 text-xs text-slate-400">{dict.footer.tagline}</p>
      </div>
    </footer>
  );
}
