import {
  STATUS_META,
  UNVERIFIED_META,
  type VerificationStatus,
} from "@/lib/api";

interface StatusBadgeProps {
  status: VerificationStatus | null;
  size?: "sm" | "lg";
}

/** A pill showing a promise's verification status (Kept / Broken / ...). */
export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const meta = status ? STATUS_META[status] : UNVERIFIED_META;
  const sizing =
    size === "lg" ? "px-3.5 py-1.5 text-sm gap-2" : "px-2.5 py-1 text-xs gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizing} ${meta.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}
