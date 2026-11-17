import assert from "node:assert/strict";
import test from "node:test";
import { buildContentSecurityPolicy, commonSecurityHeaders } from "../src/lib/security-headers";

test("the page CSP is nonce-based, blocks framing and objects, and has no unsafe-eval in production", () => {
  const policy = buildContentSecurityPolicy("abc123");
  assert.match(policy, /script-src 'self' 'nonce-abc123' 'strict-dynamic'(;|$)/);
  assert.ok(!policy.includes("unsafe-eval"));
  assert.ok(!/script-src[^;]*unsafe-inline/.test(policy));
  for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "connect-src 'self'"]) {
    assert.ok(policy.includes(directive), directive);
  }
});

test("development adds unsafe-eval only for the dev server", () => {
  assert.ok(buildContentSecurityPolicy("n", true).includes("'unsafe-eval'"));
});

test("private pages never leak a referrer and HSTS is only sent over https", () => {
  const privateHeaders = commonSecurityHeaders({ isPrivate: true, isHttps: true });
  assert.equal(privateHeaders["Referrer-Policy"], "no-referrer");
  assert.equal(privateHeaders["X-Frame-Options"], "DENY");
  assert.equal(privateHeaders["X-Content-Type-Options"], "nosniff");
  assert.ok(privateHeaders["Strict-Transport-Security"]);
  const publicHeaders = commonSecurityHeaders({ isPrivate: false, isHttps: false });
  assert.equal(publicHeaders["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(publicHeaders["Strict-Transport-Security"], undefined);
});
