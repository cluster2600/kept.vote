import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Not found</h1>
      <p className="mt-2 text-slate-600">
        We couldn&apos;t find what you were looking for.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Back to politicians
      </Link>
    </div>
  );
}
