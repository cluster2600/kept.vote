import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { localePath, type Locale } from "@/lib/i18n/config";

/** Body of the 404 page, shared by the in-layout and global not-found pages. */
export default function NotFoundContent({
  lang,
  dict,
}: {
  lang: Locale;
  dict: Dictionary;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-slate-900">{dict.notFound.title}</h1>
      <p className="mt-2 text-slate-600">{dict.notFound.body}</p>
      <Link
        href={localePath(lang)}
        className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        {dict.notFound.back}
      </Link>
    </div>
  );
}
