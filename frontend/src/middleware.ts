import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isLocale } from "@/i18n/locales";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore next internals/static
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Redirect root to default locale.
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/ru";
    const res = NextResponse.redirect(url);
    res.cookies.set("locale", "ru", { path: "/" });
    return res;
  }

  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg || !isLocale(seg)) {
    const url = request.nextUrl.clone();
    url.pathname = `/ru${pathname.startsWith("/") ? "" : "/"}${pathname}`;
    const res = NextResponse.redirect(url);
    res.cookies.set("locale", "ru", { path: "/" });
    return res;
  }

  const res = NextResponse.next();
  res.cookies.set("locale", seg, { path: "/" });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

