import Link from "next/link";
import {
  getStatus,
  listPoliticians,
  type PoliticianSummary,
  type SystemStatus,
} from "@/lib/api";
import TrackRecord from "@/components/TrackRecord";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let politicians: PoliticianSummary[] = [];
  let stats: SystemStatus | null = null;
  let error: string | null = null;

  try {
    [politicians, stats] = await Promise.all([listPoliticians(), getStatus()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="py-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Promise tracker
        </p>
        <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Did they keep their word?
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          kept.vote checks what politicians promised against what they actually
          did — kept, broken, or still in progress — each verdict backed by
          primary sources.
        </p>

        {stats && (
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <Stat label="Politicians" value={stats.politicians} />
            <Stat label="Promises tracked" value={stats.promises} />
            <Stat label="Verified" value={stats.verifications} />
          </dl>
        )}
      </section>

      {/* Politicians */}
      <section className="pb-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Politicians
        </h2>

        {error ? (
          <ConnectionError message={error} />
        ) : politicians.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {politicians.map((p) => (
              <li key={p.id}>
                <PoliticianCard politician={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-3xl font-bold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function PoliticianCard({ politician: p }: { politician: PoliticianSummary }) {
  const subtitle = [p.party, p.country].filter(Boolean).join(" · ");
  const verified =
    p.kept_count +
    p.broken_count +
    p.in_progress_count +
    p.compromise_count +
    p.no_action_count;
  return (
    <Link
      href={`/politicians/${p.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {p.promise_count} promise{p.promise_count === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4">
        <TrackRecord
          kept={p.kept_count}
          broken={p.broken_count}
          inProgress={p.in_progress_count}
          compromise={p.compromise_count}
          noAction={p.no_action_count}
          showLegend
        />
        {verified === 0 && (
          <p className="mt-2 text-xs text-slate-400">No verified promises yet</p>
        )}
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-sm text-slate-600">
        No politicians yet. Run the seed script to load demo data:
      </p>
      <code className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
        python seed.py
      </code>
    </div>
  );
}

function ConnectionError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
      <p className="text-sm font-medium text-rose-800">
        Couldn&apos;t reach the backend API.
      </p>
      <p className="mt-1 text-sm text-rose-700">
        Make sure the FastAPI backend is running and{" "}
        <code className="rounded bg-rose-100 px-1">API_BASE_URL</code> points to
        it.
      </p>
      <p className="mt-2 break-all text-xs text-rose-500">{message}</p>
    </div>
  );
}
