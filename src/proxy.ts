import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie)
    return request.nextUrl.pathname.startsWith("/admin")
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next();

  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/invite")
  ) {
    return NextResponse.redirect(new URL("/admin/users", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/invite/:path*"],
};
