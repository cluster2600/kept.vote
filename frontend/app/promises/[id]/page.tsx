import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
  getPolitician,
  getPromise,
  getPromiseVerification,
  NotFoundError,
  type Politician,
  type PromiseRecord,
  type Verification,
} from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import ConfidenceMeter from "@/components/ConfidenceMeter";

export const dynamic = "force-dynamic";

export default async function PromisePage({
  params,
}: {
  params: { id: string };
}) {
  let promise: PromiseRecord;
  let verification: Verification | null;
  try {
    [promise, verification] = await Promise.all([
      getPromise(params.id),
      getPromiseVerification(params.id),
    ]);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  // Best-effort: load the politician for the breadcrumb.
  let politician: Politician | null = null;
  try {
    politician = await getPolitician(promise.politician_id);
  } catch {
    politician = null;
  }

  const dateMade = formatDate(promise.date_made);
  const verifiedDate = formatDate(verification?.verified_date ?? null);

  // Prefer the verification's full source list; fall back to the promise's
  // single source_url. First entry is treated as the primary source.
  const sources =
    verification?.source_urls && verification.source_urls.length > 0
      ? verification.source_urls
      : promise.source_url
        ? [promise.source_url]
        : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-700">
          Politicians
        </Link>
        <span aria-hidden>/</span>
        {politician ? (
          <Link
            href={`/politicians/${politician.id}`}
            className="hover:text-slate-700"
          >
            {politician.name}
          </Link>
        ) : (
          <span>Promise</span>
        )}
      </nav>

      {/* Promise + verdict */}
      <article className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {promise.category && (
              <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                {promise.category}
              </span>
            )}
            {dateMade && <span>Promised {dateMade}</span>}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {promise.title}
          </h1>
          {promise.description && (
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
              {promise.description}
            </p>
          )}
        </div>

        {verification ? (
          <div className="p-6">
            {/* Verdict header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Verdict
                </span>
                <StatusBadge status={verification.status} size="lg" />
              </div>
              <div className="w-full sm:max-w-[200px]">
                <ConfidenceMeter
                  score={verification.confidence_score}
                  size="lg"
                />
              </div>
            </div>

            {/* Reasoning */}
            {verification.reasoning && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-slate-900">
                  Assessment
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
                  {verification.reasoning}
                </p>
              </div>
            )}

            {/* Key evidence */}
            {verification.key_evidence &&
              verification.key_evidence.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Key evidence
                  </h2>
                  <ul className="mt-2 space-y-2">
                    {verification.key_evidence.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 text-[15px] leading-relaxed text-slate-700"
                      >
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Sources */}
            {sources.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-slate-900">
                  {sources.length > 1 ? "Sources" : "Source"}
                </h2>
                <ul className="mt-2 space-y-1.5">
                  {sources.map((url, i) => (
                    <li key={i} className="text-sm">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-baseline gap-1.5 text-blue-600 hover:text-blue-700"
                      >
                        <span className="font-medium">
                          {i === 0 ? "Primary source" : "Additional source"}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="break-all text-slate-500">
                          {hostOf(url)}
                        </span>
                        <span aria-hidden>↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Provenance */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              {verifiedDate && <span>Last reviewed {verifiedDate}</span>}
              {verification.human_review_status === "approved" && (
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Editorially reviewed
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <StatusBadge status={null} size="lg" />
            <p className="mt-3 text-sm text-slate-500">
              This promise has not been verified yet.
            </p>
          </div>
        )}
      </article>

      {/* Original quote */}
      {promise.original_text && (
        <blockquote className="mt-6 border-l-2 border-slate-300 pl-4 text-sm italic leading-relaxed text-slate-600">
          “{promise.original_text}”
        </blockquote>
      )}
    </div>
  );
}

/** Extract a readable host (without "www.") from a URL for display. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
