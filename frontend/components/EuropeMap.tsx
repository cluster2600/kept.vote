"use client";

import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";

import { EUROPE_COUNTRIES, EUROPE_VIEWBOX } from "@/lib/map/europe";

/** A country with politicians on the site. */
export interface MapEntry {
  name: string;
  /** Home page filtered to this country. */
  href: string;
  /** Localized summary, e.g. "59 politicians". */
  detail: string;
}

interface Props {
  covered: Record<string, MapEntry>;
  /** Localized names of the European countries not covered yet. */
  others: Record<string, string>;
  selected: string | null;
  /** Href that clears the selection (the selected country links back to it). */
  allHref: string;
  labels: { map: string; covered: string; notCovered: string };
}

interface Tip {
  code: string;
  x: number;
  y: number;
}

/** Map of Europe, from the Atlantic to the Urals. Countries with politicians
 *  link to the home page filtered to them; the geometry comes pre-projected
 *  from lib/map/europe.ts (scripts/build-europe-map.mjs). */
export default function EuropeMap({ covered, others, selected, allHref, labels }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  function track(event: PointerEvent<SVGSVGElement>) {
    const target = (event.target as Element).closest("[data-code]");
    const box = frame.current?.getBoundingClientRect();
    if (!target || !box) return setTip(null);
    setTip({
      code: target.getAttribute("data-code")!,
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    });
  }

  const tipEntry = tip ? covered[tip.code] : null;
  const tipName = tip ? (tipEntry?.name ?? others[tip.code]) : null;

  return (
    <figure className="mx-auto mb-6 max-w-2xl">
      <div
        ref={frame}
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-sky-50/60"
      >
        <svg
          viewBox={EUROPE_VIEWBOX}
          role="group"
          aria-label={labels.map}
          className="block h-auto w-full"
          onPointerMove={track}
          onPointerLeave={() => setTip(null)}
        >
          {EUROPE_COUNTRIES.map((c, i) => {
            if (!c.code) {
              return <path key={i} d={c.d} className="fill-slate-100/70" aria-hidden />;
            }
            const entry = covered[c.code];
            if (!entry) {
              return (
                <path
                  key={c.code}
                  d={c.d}
                  data-code={c.code}
                  className="fill-slate-200 stroke-white"
                  strokeWidth={0.75}
                  aria-hidden
                />
              );
            }
            const active = selected === c.code;
            return (
              <Link
                key={c.code}
                href={active ? allHref : entry.href}
                scroll={false}
                data-code={c.code}
                aria-label={`${entry.name}, ${entry.detail}`}
                aria-current={active ? "page" : undefined}
                className="group outline-none"
              >
                <path
                  d={c.d}
                  className={`stroke-white transition-colors ${
                    active
                      ? "fill-blue-600"
                      : "fill-blue-300 group-hover:fill-blue-500 group-focus-visible:fill-blue-500"
                  }`}
                  strokeWidth={0.75}
                />
                {c.dot && (
                  <circle
                    cx={c.dot[0]}
                    cy={c.dot[1]}
                    r={6}
                    className={`stroke-white ${
                      active ? "fill-blue-600" : "fill-blue-400 group-hover:fill-blue-600"
                    }`}
                    strokeWidth={1.5}
                  />
                )}
              </Link>
            );
          })}
        </svg>

        {tip && tipName && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-md"
            style={{ left: tip.x, top: tip.y - 10 }}
          >
            <span className="font-semibold">{tipName}</span>
            <span className="block text-slate-300">
              {tipEntry ? tipEntry.detail : labels.notCovered}
            </span>
          </div>
        )}
      </div>

      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-300" aria-hidden />
          {labels.covered}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" aria-hidden />
          {labels.notCovered}
        </span>
      </figcaption>
    </figure>
  );
}
