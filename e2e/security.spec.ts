import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../playwright.config";
import { i18n, pagePath, resetBackend } from "./helpers";
import type { PageKey } from "../src/lib/paths";

test.beforeEach(resetBackend);

const API = "http://127.0.0.1:3100";

test("pages carry a nonce-based CSP and the common security headers", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response!.headers();
  const csp = headers["content-security-policy"];
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain("unsafe-eval");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");

  // The nonce changes on every request.
  const again = await page.goto("/");
  expect(again!.headers()["content-security-policy"]).not.toBe(csp);
});

test("private pages and API answers are locked down further", async ({ page, request }) => {
  const admin = await page.goto("/admin");
  expect(admin!.headers()["referrer-policy"]).toBe("no-referrer");
  expect(admin!.headers()["cache-control"]).toContain("no-store");
  expect(admin!.headers()["x-robots-tag"]).toContain("noindex");

  const api = await request.get(`${API}/api/health`);
  expect(api.headers()["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
  expect(api.headers()["x-frame-options"]).toBe("DENY");
  expect(api.headers()["cache-control"]).toContain("no-store");
});

async function collectViolations(page: Page) {
  const violations: string[] = [];
  await page.exposeFunction("reportCspViolation", (value: string) => violations.push(value));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { reportCspViolation: (value: string) => void }).reportCspViolation(
        `${event.violatedDirective} blocked ${event.blockedURI || "inline"}`,
      );
    });
  });
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text());
  });
  return violations;
}

test("the policy does not break any page, interaction or form", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  const violations = await collectViolations(page);

  const publicPages: PageKey[] = ["home", "wishlistCreate", "drawCreate", "wheel", "help", "privacy"];
  for (const key of publicPages) {
    await page.goto(pagePath(testInfo, key));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  // Client-side JavaScript must run (it needs the nonce and strict-dynamic): spin the wheel.
  await page.goto(pagePath(testInfo, "wheel"));
  await page.getByRole("button", { name: t("wheel.spin") }).click();
  await expect(page.locator(".wheel-result strong")).toBeVisible({ timeout: 8000 });

  // Server-action form (admin login) and the themed admin page.
  await page.goto("/admin");
  await page.getByLabel(t("admin.login.password")).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: t("admin.login.submit") }).click();
  await expect(page.locator("#admin-current-title")).toBeVisible();
  await page.goto("/admin/usage");
  await expect(page.getByRole("table").first()).toBeVisible();

  expect(violations, "CSP violations").toEqual([]);
});

test("pages cannot be framed by other sites", async ({ page }) => {
  await page.goto("/");
  const framed = await page.evaluate(async () => {
    const frame = document.createElement("iframe");
    frame.src = "/";
    document.body.appendChild(frame);
    await new Promise((resolve) => { frame.onload = resolve; setTimeout(resolve, 1500); });
    try { return frame.contentDocument?.body?.children.length ?? 0; } catch { return -1; }
  });
  // A blocked frame has no accessible document body content.
  expect(framed).toBeLessThanOrEqual(0);
});
