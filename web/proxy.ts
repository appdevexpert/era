import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const onPublicPath = isPublicPath(pathname);

  if (!hasSession && !onPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/login") {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") ? next : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api/|favicon\\.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico|woff2?|ttf)$).*)",
  ],
};
