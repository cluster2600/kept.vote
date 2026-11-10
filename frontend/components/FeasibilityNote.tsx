import {
  FEASIBILITY_META,
  type FeasibilityBasis,
  type FeasibilityKey,
} from "@/lib/api";

/** Feasibility labels, keyed like the `feasibility.labels` dictionary section. */
export type FeasibilityLabels = Record<FeasibilityKey, string>;

interface FeasibilityNoteProps {
  feasibility: FeasibilityKey | null;
  basis: FeasibilityBasis | null;
  note: string | null;
  sourceUrls: string[] | null;
  labels: FeasibilityLabels;
  strings: {
    heading: string;
    basisAssessedGeneric: string;
    basisAnalysis: string;
    sourcesLabel: string;
  };
  /** Language of `note`, when it is machine-translated or in another language. */
  lang?: string;
}

/**
 * Whether a promise was ever deliverable, shown beside the verdict on what
 * happened.
 *
 * Two things this component insists on, because the claim is a strong one about
 * a named person:
 *
 * - the basis is always stated — an outside assessment and kept.vote's own
 *   structural reading are not equivalent, and the reader is told which
 *   they are looking at;
 * - a verdict with no explanation renders nothing at all, rather than a bare
 *   badge the reader cannot check.
 */
export default function FeasibilityNote({
  feasibility,
  basis,
  note,
  sourceUrls,
  labels,
  strings,
  lang,
}: FeasibilityNoteProps) {
  // "unassessed" is the absence of a judgement: say nothing rather than
  // occupy the page with a non-finding.
  if (!feasibility || feasibility === "unassessed") return null;
  if (!note?.trim()) return null;

  const meta = FEASIBILITY_META[feasibility];
  const sources = sourceUrls?.filter((url) => url?.trim()) ?? [];

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          {strings.heading}
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
        >
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
          {labels[feasibility]}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-slate-600" lang={lang}>
        {note}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {basis === "assessed"
          ? strings.basisAssessedGeneric
          : strings.basisAnalysis}
      </p>

      {sources.length > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          <span className="font-medium">{strings.sourcesLabel}: </span>
          {sources.map((url, index) => (
            <span key={url}>
              {index > 0 && ", "}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
              >
                {hostOf(url)}
              </a>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/** Host of a URL, for a compact source link. Falls back to the raw string. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
