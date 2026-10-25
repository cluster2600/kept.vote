"use client";

import { useState, type ReactNode } from "react";

export interface TabDef {
  key: string;
  label: string;
  count: number;
}

/** Sticky tab bar switching between profile panels. The panels are rendered on
 *  the server (so all locale formatting happens there) and passed in; only the
 *  active one is mounted, so hidden panels add no HTML to the page. */
export default function PoliticianTabs({
  tabs,
  panels,
  ariaLabel,
}: {
  tabs: TabDef[];
  panels: Record<string, ReactNode>;
  ariaLabel: string;
}) {
  const [active, setActive] = useState<string>(tabs[0]?.key ?? "background");

  return (
    <div className="mt-6">
      {/* Sticky tab bar — scrolls horizontally on small screens. */}
      <div className="sticky top-[60px] z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur-sm">
        <nav className="flex gap-1 overflow-x-auto" aria-label={ariaLabel}>
          {tabs.map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                aria-current={isActive ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "border-blue-600 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6">{panels[active]}</div>
    </div>
  );
}
