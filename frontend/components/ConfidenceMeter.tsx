interface ConfidenceMeterProps {
  score: number;
  size?: "sm" | "lg";
}

/** A horizontal bar conveying how confident the verdict is (0-1). */
export default function ConfidenceMeter({
  score,
  size = "sm",
}: ConfidenceMeterProps) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const height = size === "lg" ? "h-2.5" : "h-1.5";
  // Higher confidence reads as more solid; keep a single trustworthy hue.
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`uppercase tracking-wide text-slate-500 ${
            size === "lg" ? "text-xs font-semibold" : "text-[10px] font-medium"
          }`}
        >
          Confidence
        </span>
        <span
          className={`tabular-nums font-semibold text-slate-700 ${
            size === "lg" ? "text-sm" : "text-xs"
          }`}
        >
          {pct}%
        </span>
      </div>
      <div className={`w-full rounded-full bg-slate-200 ${height}`}>
        <div
          className={`${height} rounded-full bg-blue-600 transition-all`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
