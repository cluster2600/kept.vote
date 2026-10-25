"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  AUTONYMS,
  LOCALES,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";

/** Language menu: a native <details> disclosure of plain links, so it works
 *  without JavaScript; with JS, choosing a language also remembers it in the
 *  NEXT_LOCALE cookie used by the proxy for locale-less URLs. */
export default function LanguageSwitcher({
  lang,
  label,
}: {
  lang: Locale;
  label: string;
}) {
  const pathname = usePathname() ?? `/${lang}`;
  const router = useRouter();
  const ref = useRef<HTMLDetailsElement>(null);
  // Strip the current locale segment; keep the rest of the path.
  const rest = pathname.replace(/^\/[^/]+/, "");

  // Close on Escape or a click outside the menu.
  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) {
        ref.current.open = false;
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(e: React.MouseEvent<HTMLAnchorElement>, locale: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    if (ref.current) ref.current.open = false;
    // Keep the query (e.g. an active country filter) across the switch.
    const { search, hash } = window.location;
    if (search || hash) {
      e.preventDefault();
      router.push(`/${locale}${rest}${search}${hash}`);
    }
  }

  return (
    <details ref={ref} className="relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 [&::-webkit-details-marker]:hidden"
        aria-label={`${label}: ${AUTONYMS[lang]}`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-1.6-2.1A6.5 6.5 0 0 1 3.55 10.75h2.7c.1 1.9.55 3.73 1.3 5.15Zm3.2 0c.75-1.42 1.2-3.25 1.3-5.15h2.7a6.5 6.5 0 0 1-4 5.15Zm-1.6.6c-.68-.93-1.4-2.92-1.55-5.75h3.1c-.15 2.83-.87 4.82-1.55 5.75Zm-1.55-7.25c.15-2.83.87-4.82 1.55-5.75.68.93 1.4 2.92 1.55 5.75h-3.1Zm-1.5 0h-2.7A6.5 6.5 0 0 1 8.4 4.1c-.75 1.42-1.2 3.25-1.3 5.15Zm6.1 0c-.1-1.9-.55-3.73-1.3-5.15a6.5 6.5 0 0 1 4 5.15h-2.7Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="uppercase">{lang}</span>
      </summary>
      <ul
        className="absolute right-0 z-30 mt-2 max-h-[70vh] w-52 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        aria-label={label}
      >
        {LOCALES.map((l) => (
          <li key={l}>
            <Link
              href={`/${l}${rest}`}
              hrefLang={l}
              lang={l}
              onClick={(e) => choose(e, l)}
              aria-current={l === lang ? "true" : undefined}
              className={`flex items-center justify-between gap-3 px-3 py-1.5 text-sm ${
                l === lang
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {AUTONYMS[l]}
              <span className="text-xs uppercase text-slate-400">{l}</span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
