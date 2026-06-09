import Link from "next/link";
import { formatDate, type PromiseWithVerification } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

/** A single promise row linking to its detail page (status badge + confidence). */
export default function PromiseRow({
  promise,
}: {
  promise: PromiseWithVerification;
}) {
  const v = promise.verification;
  const date = formatDate(promise.date_made);
  return (
    <Link
      href={`/promises/${promise.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{promise.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            {promise.category && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                {promise.category}
              </span>
            )}
            {date && <span>Promised {date}</span>}
          </p>
          {promise.description && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
              {promise.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={v?.status ?? null} />
          {v && (
            <span className="text-xs tabular-nums text-slate-400">
              {Math.round(v.confidence_score * 100)}% confidence
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
