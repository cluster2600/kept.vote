import { STATUS_META } from "@/lib/api";

interface TrackRecordProps {
  kept: number;
  broken: number;
  inProgress: number;
  compromise: number;
  noAction: number;
  showLegend?: boolean;
}

/** A segmented bar summarising a politician's verified promise outcomes. */
export default function TrackRecord({
  kept,
  broken,
  inProgress,
  compromise,
  noAction,
  showLegend = false,
}: TrackRecordProps) {
  const total = kept + broken + inProgress + compromise + noAction;

  const segments = [
    { key: "fulfilled", count: kept, meta: STATUS_META.fulfilled },
    { key: "compromise", count: compromise, meta: STATUS_META.compromise },
    { key: "in_progress", count: inProgress, meta: STATUS_META.in_progress },
    { key: "broken", count: broken, meta: STATUS_META.broken },
    { key: "no_action", count: noAction, meta: STATUS_META.no_action },
  ] as const;

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {total === 0 ? (
          <div className="h-full w-full bg-slate-100" />
        ) : (
          segments.map((s) =>
            s.count > 0 ? (
              <div
                key={s.key}
                className={`h-full ${s.meta.bar}`}
                style={{ width: `${(s.count / total) * 100}%` }}
                title={`${s.meta.label}: ${s.count}`}
              />
            ) : null,
          )
        )}
      </div>
      {showLegend && total > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {segments
            .filter((s) => s.count > 0)
            .map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${s.meta.dot}`} />
                {s.count} {s.meta.label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
