import { NextRequest, NextResponse } from "next/server";
import { privatePathPrefixes } from "./lib/paths";
import {
  API_CONTENT_SECURITY_POLICY,
  buildContentSecurityPolicy,
  commonSecurityHeaders,
} from "./lib/security-headers";

const PRIVATE_PREFIXES = privatePathPrefixes();

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isPrivatePath(pathname: string) {
  return (
    isApiPath(pathname) ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = isApiPath(pathname);
  const isPrivate = isPrivatePath(pathname);
  const isHttps = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")) === "https";

  // Pages get a per-request nonce; Next.js reads it from the request's CSP header and applies it to its scripts.
  const requestHeaders = new Headers(request.headers);
  let contentSecurityPolicy = API_CONTENT_SECURITY_POLICY;
  if (!isApi) {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    contentSecurityPolicy = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  for (const [name, value] of Object.entries(commonSecurityHeaders({ isPrivate, isHttps }))) {
    response.headers.set(name, value);
  }
  if (isPrivate) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

// Next.js needs a statically analyzable matcher, so the private paths are listed literally here.
// tests/paths.test.ts verifies that this list covers every private path in src/lib/paths.ts (Dutch and English).
// The last entry applies the security headers and the CSP nonce to every page; static assets are skipped.
export const config = {
  matcher: [
    "/api/:path*",
    "/verlanglijstje/beheren/:path*",
    "/verlanglijstje/bekijken/:path*",
    "/trekking-beheren/:path*",
    "/lootje/:path*",
    "/beheerlink-kwijt/:path*",
    "/recover-link/:path*",
    "/wishlist/manage/:path*",
    "/wishlist/view/:path*",
    "/draw/manage/:path*",
    "/draw/reveal/:path*",
    "/admin/:path*",
    "/((?!_next/static|_next/image|images/|motifs/|og/|favicon.ico|icon.svg|apple-icon.png).*)",
  ],
};
