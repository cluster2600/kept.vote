"use client";

import { useMemo, useState } from "react";
import {
  STATUS_META,
  type PromiseWithVerification,
  type VerificationStatus,
} from "@/lib/api";
import PromiseRow from "@/components/PromiseRow";
import TrackRecord from "@/components/TrackRecord";

type Filter = VerificationStatus | "all";

const FILTER_ORDER: VerificationStatus[] = [
  "fulfilled",
  "in_progress",
  "compromise",
  "broken",
  "no_action",
];

type Counts = Record<VerificationStatus, number>;
const zero = (): Counts => ({
  fulfilled: 0,
  in_progress: 0,
  compromise: 0,
  broken: 0,
  no_action: 0,
});

/** Promises grouped by category into collapsible accordions, with a status
 *  filter. Collapsed by default; a status filter auto-expands matching groups. */
export default function PromisesTab({
  promises,
  politicianName,
}: {
  promises: PromiseWithVerification[];
  politicianName: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Data-driven: if a politician's promises are (almost) all "No Action", they
  // have not enacted policy — surface a non-officeholder context banner rather
  // than letting it read as a wall of identical badges.
  const noActionCount = promises.filter(
    (p) => p.verification?.status === "no_action",
  ).length;
  const campaignOnly =
    promises.length > 0 && noActionCount / promises.length >= 0.9;

  const groups = useMemo(() => {
    const map = new Map<string, PromiseWithVerification[]>();
    for (const p of promises) {
      const cat = p.category?.trim() || "Other";
      const arr = map.get(cat) ?? [];
      arr.push(p);
      map.set(cat, arr);
    }
    const list = [...map.entries()].map(([category, items]) => {
      const counts = zero();
      for (const p of items) if (p.verification) counts[p.verification.status]++;
      return { category, items, counts };
    });
    list.sort(
      (a, b) =>
        b.items.length - a.items.length || a.category.localeCompare(b.category),
    );
    return list;
  }, [promises]);

  const totalCounts = useMemo(() => {
    const c = zero();
    for (const p of promises) if (p.verification) c[p.verification.status]++;
    return c;
  }, [promises]);

  const matches = (p: PromiseWithVerification) =>
    filter === "all" || p.verification?.status === filter;

  function toggle(cat: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div>
      {campaignOnly && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-700">Context.</span>{" "}
          {politicianName} has not held executive office. These are campaign
          pledges, not enacted policy — so each is recorded as{" "}
          <span className="font-medium">&ldquo;No Action&rdquo;</span> rather
          than kept or broken.
        </div>
      )}

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip
          label="All"
          count={promises.length}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {FILTER_ORDER.map((s) => (
          <FilterChip
            key={s}
            label={STATUS_META[s].label}
            count={totalCounts[s]}
            dot={STATUS_META[s].dot}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </div>

      {/* Category accordions */}
      <div className="space-y-3">
        {groups.map((g) => {
          const visible = g.items.filter(matches);
          if (visible.length === 0) return null;
          const open = filter !== "all" || expanded.has(g.category);
          return (
            <div
              key={g.category}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggle(g.category)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Chevron open={open} />
                  <span className="truncate font-semibold text-slate-900">
                    {g.category}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {filter === "all"
                      ? g.items.length
                      : `${visible.length} / ${g.items.length}`}
                  </span>
                </span>
                <span className="hidden w-40 shrink-0 sm:block">
                  <TrackRecord
                    kept={g.counts.fulfilled}
                    broken={g.counts.broken}
                    inProgress={g.counts.in_progress}
                    compromise={g.counts.compromise}
                    noAction={g.counts.no_action}
                  />
                </span>
              </button>
              {open && (
                <ul className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-4">
                  {visible.map((p) => (
                    <li key={p.id}>
                      <PromiseRow promise={p} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
  dot,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {dot && (
        <span
          className={`h-2 w-2 rounded-full ${dot} ${active ? "ring-2 ring-white/40" : ""}`}
          aria-hidden
        />
      )}
      {label}
      <span
        className={`tabular-nums ${active ? "text-white/70" : "text-slate-400"}`}
      >
        {count}
      </span>
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
        open ? "rotate-90" : ""
      }`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
