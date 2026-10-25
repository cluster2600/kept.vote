import {
  STATUS_META,
  UNVERIFIED_META,
  type VerificationStatus,
} from "@/lib/api";

/** Verification-status labels, keyed like the `status` dictionary section. */
export type StatusLabels = Record<VerificationStatus | "unverified", string>;

interface StatusBadgeProps {
  status: VerificationStatus | null;
  labels: StatusLabels;
  size?: "sm" | "lg";
}

/** A pill showing a promise's verification status (Kept / Broken / ...). */
export default function StatusBadge({
  status,
  labels,
  size = "sm",
}: StatusBadgeProps) {
  const meta = status ? STATUS_META[status] : UNVERIFIED_META;
  const sizing =
    size === "lg" ? "px-3.5 py-1.5 text-sm gap-2" : "px-2.5 py-1 text-xs gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizing} ${meta.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
      {labels[status ?? "unverified"]}
    </span>
  );
}
