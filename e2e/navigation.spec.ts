import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, i18n, pagePath, resetBackend } from "./helpers";

test.beforeEach(resetBackend);

test("homepage renders in the domain language with working primary navigation", async ({ page }, testInfo) => {
  const { locale, t } = i18n(testInfo);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const nav = page.locator(".desktop-nav");
  await nav.getByRole("link", { name: t("nav.wishlist") }).click();
  await expect(page).toHaveURL(new RegExp(`${pagePath(testInfo, "wishlistCreate")}$`));
  await page.goto("/");
  await nav.getByRole("link", { name: t("nav.draw") }).click();
  await expect(page).toHaveURL(new RegExp(`${pagePath(testInfo, "drawCreate")}$`));
});

test("the mobile menu opens, lists the destinations and closes", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator(".desktop-nav")).toBeHidden();

  const menu = page.locator("details.mobile-nav");
  await menu.locator("summary").click();
  const panel = menu.getByRole("navigation", { name: t("nav.label") });
  await expect(panel.getByRole("link", { name: t("nav.wishlist") })).toBeVisible();
  await expect(panel.getByRole("link", { name: t("nav.draw") })).toBeVisible();
  await expect(panel.getByRole("link", { name: t("nav.help") })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await menu.locator("summary").click();
  await expect(panel).toBeHidden();
});

test("public pages link to the same page on the other domain", async ({ page }, testInfo) => {
  const { locale } = i18n(testInfo);
  const other = locale === "nl" ? "en" : "nl";
  await page.goto("/");
  const link = page.locator(".desktop-nav .language-links a");
  await expect(link).toHaveAttribute("hreflang", other);
  await expect(link).toHaveAttribute("href", other === "en" ? "https://wishanddraw.com" : "https://lijstjesenlootjes.nl");
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(3); // nl, en, x-default in the head
});

test("on personal pages the language switch overrides the domain default and persists", async ({ page }, testInfo) => {
  const { locale, t } = i18n(testInfo);
  const other = locale === "nl" ? "en" : "nl";
  await page.goto(locale === "nl" ? "/lootje" : "/draw/reveal");
  await page.locator(".desktop-nav").getByLabel(t("language.label")).selectOption(other);
  await expect(page.locator("html")).toHaveAttribute("lang", other);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", other);
});

test("the English domain serves English paths and redirects Dutch and legacy ones", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "en", "English paths exist only on the English domain.");
  const wishlistPath = pagePath(testInfo, "wishlistCreate");
  const drawPath = pagePath(testInfo, "drawCreate");
  await page.goto("/verlanglijstje-maken");
  await expect(page).toHaveURL(new RegExp(`${wishlistPath}$`));
  await page.goto("/create-wishlist");
  await expect(page).toHaveURL(new RegExp(`${wishlistPath}$`));
  await page.goto(drawPath);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#organizer")).toBeVisible();
});

// Plain API calls go straight to the proxy; Node's HTTP client does not use Chrome's host mapping.
const API = "http://127.0.0.1:3100";

test("health endpoint reports ok without leaking details", async ({ request }) => {
  const response = await request.get(`${API}/api/health`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(Object.keys(body).sort()).toEqual(["checks", "status", "timestamp"]);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("the cleanup endpoint refuses unauthenticated and wrong callers", async ({ request }) => {
  expect((await request.get(`${API}/api/cron/cleanup`)).status()).toBe(401);
  expect((await request.get(`${API}/api/cron/cleanup`, { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  const ok = await request.get(`${API}/api/cron/cleanup`, { headers: { authorization: "Bearer e2e-test-cron-secret-0123456789abcdef" } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ purged: { wishlists: 0, draws: 0, accessTokens: 0, sessions: 0 } });
});

test("writes from a foreign origin are rejected", async ({ request }) => {
  const response = await request.post(`${API}/api/wishlists`, {
    headers: { origin: "https://evil.example" },
    data: { title: "x", wishes: [{ title: "y" }] },
  });
  expect(response.status()).toBe(403);
});
