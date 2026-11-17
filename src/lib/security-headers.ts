/**
 * Browser-side security policy. Pure functions so they can be unit-tested; src/proxy.ts applies them.
 *
 * Scripts need a per-request nonce (Next.js applies it to its own scripts) and `strict-dynamic`.
 * Styles allow inline because React emits style attributes, which a nonce cannot cover; inline styles
 * cannot run script. Nothing is framed, embedded as an object, or sent to a third-party origin.
 */
export function buildContentSecurityPolicy(nonce: string, isDevelopment = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** JSON API responses never render anything. */
export const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'";

export const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "interest-cohort=()",
].join(", ");

export type SecurityHeaderOptions = { isPrivate: boolean; isHttps: boolean };

/** Headers every matched response carries. Private pages never leak their URL through the referrer. */
export function commonSecurityHeaders({ isPrivate, isHttps }: SecurityHeaderOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": isPrivate ? "no-referrer" : "strict-origin-when-cross-origin",
    "Permissions-Policy": PERMISSIONS_POLICY,
    "Cross-Origin-Opener-Policy": "same-origin",
  };
  if (isHttps) headers["Strict-Transport-Security"] = "max-age=63072000";
  return headers;
}
