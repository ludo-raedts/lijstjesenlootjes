import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/verlanglijstje/beheren/:path*",
    "/verlanglijstje/bekijken/:path*",
    "/trekking-beheren/:path*",
    "/lootje/:path*",
    "/admin/:path*",
  ],
};
