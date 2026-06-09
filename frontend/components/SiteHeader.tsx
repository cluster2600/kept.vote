import Link from "next/link";

/** Top navigation bar with the kept.vote wordmark. */
export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="group inline-flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 0 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            kept<span className="text-blue-600">.vote</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-slate-900">
            Politicians
          </Link>
          <a
            href="#methodology"
            className="hidden hover:text-slate-900 sm:inline"
          >
            Methodology
          </a>
        </nav>
      </div>
    </header>
  );
}
