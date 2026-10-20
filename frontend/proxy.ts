import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  matchAcceptLanguage,
  resolveLocale,
} from "@/lib/i18n/config";

/** Locale routing: every page lives under /<locale>/…. A path without a
 *  supported locale prefix (including old links such as /politicians/<id>) is
 *  redirected, choosing the locale from the NEXT_LOCALE cookie, then the
 *  Accept-Language header, then English. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (isLocale(first)) {
    // Pass the locale on so route-param-less server code (not-found) can read it.
    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, first);
    return NextResponse.next({ request: { headers } });
  }

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    (cookie && resolveLocale(cookie)) ||
    matchAcceptLanguage(request.headers.get("accept-language")) ||
    DEFAULT_LOCALE;

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  url.search = search;
  // 307: the target depends on the visitor's language, so it must not be cached
  // as a permanent redirect.
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  // Skip Next internals and anything that looks like a file (has an extension).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
