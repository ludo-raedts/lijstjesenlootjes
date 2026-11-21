import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../playwright.config";
import { createDrawViaApi, createWishlistViaApi, expectNoAxeViolations, i18n, mockCountryTraffic, mockTraffic, pagePath, rebase, resetBackend } from "./helpers";

test.beforeEach(resetBackend);

async function login(page: import("@playwright/test").Page, t: ReturnType<typeof i18n>["t"], password = E2E_ADMIN_PASSWORD) {
  await page.goto("/admin");
  await page.getByLabel(t("admin.login.password")).fill(password);
  await page.getByRole("button", { name: t("admin.login.submit") }).click();
}

test("logging in lands on the usage dashboard with KPIs", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await login(page, t);
  await expect(page).toHaveURL(/\/admin\/usage$/);
  await expect(page.locator("#usage-kpi-title")).toBeVisible();
});

test("admin pages are not cacheable or indexable and ask for a login", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  const response = await page.goto("/admin");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByLabel(t("admin.login.password"))).toBeVisible();
});

test("a wrong password is refused", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await login(page, t, "not-the-password");
  await expect(page.getByRole("alert").filter({ hasText: t("admin.login.invalid") })).toBeVisible();
});

test("log in, save a manual theme and layout, reset to automatic, log out", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await login(page, t);
  await page.getByRole("link", { name: t("admin.nav.settings") }).click();
  await expect(page.locator("#admin-current-title")).toBeVisible();
  await expect(page.locator(".layout-preview")).toBeVisible();
  await expect(page.getByText(t("admin.source.automatic"))).toBeVisible();

  await page.locator("#theme-mode").selectOption("manual");
  await page.locator("#manual-theme").selectOption("winter");
  await page.locator("#layout-mode").selectOption("manual");
  await page.locator("#manual-layout").selectOption("split");
  await page.getByRole("button", { name: t("admin.save.submit") }).click();
  await expect(page.getByRole("status").filter({ hasText: t("admin.save.success") })).toBeVisible();
  await expect(page.locator("#admin-current-title")).toHaveText(t("admin.theme.winter"));

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "winter");
  await expect(page.locator("html")).toHaveAttribute("data-layout", "split");
  await expect(page.locator("html")).toHaveAttribute("data-theme-source", "manual");

  await page.goto("/admin");
  await page.locator("#theme-mode").selectOption("automatic");
  await page.locator("#layout-mode").selectOption("automatic");
  await page.getByRole("button", { name: t("admin.save.submit") }).click();
  await expect(page.getByRole("status").filter({ hasText: t("admin.save.success") })).toBeVisible();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme-source", "automatic");

  await page.goto("/admin");
  await page.getByRole("button", { name: t("admin.logout") }).click();
  await expect(page.getByLabel(t("admin.login.password"))).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByLabel(t("admin.login.password"))).toBeVisible();
});

test("repeated wrong passwords are rate limited", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.goto("/admin");
  const submit = async (password: string) => {
    await page.getByLabel(t("admin.login.password")).fill(password);
    await Promise.all([
      page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/admin"),
      page.getByRole("button", { name: t("admin.login.submit") }).click(),
    ]);
  };
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    await submit(`wrong-${attempt}`);
    await expect(page.getByRole("alert").filter({ hasText: t("admin.login.invalid") })).toBeVisible();
  }
  // The ninth attempt is refused even with the right password.
  await submit(E2E_ADMIN_PASSWORD);
  await expect(page.getByRole("alert").filter({ hasText: t("admin.login.rateLimited") })).toBeVisible();
});

test("the usage dashboard needs a login and shows anonymous counts only", async ({ page, browser, baseURL }, testInfo) => {
  const { locale, t } = i18n(testInfo);
  const expectedCountry = locale === "nl" ? "NL" : "GB";

  // Without a session the usage page sends visitors to the login.
  await page.goto("/admin/usage");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByLabel(t("admin.login.password"))).toBeVisible();

  // Generate some synthetic activity in separate visitor contexts.
  const visitor = await browser.newContext({
    extraHTTPHeaders: { "x-vercel-ip-country": expectedCountry },
  });
  const visitorPage = await visitor.newPage();
  const firstMeasurement = visitorPage.waitForRequest((request) =>
    request.method() === "POST" && new URL(request.url()).pathname === "/api/traffic",
  );
  await visitorPage.goto(`${baseURL}/?campaign=not-stored#not-stored`);
  const measurementRequest = await firstMeasurement;
  expect(measurementRequest.headers().referer ?? "").toBe("");
  expect(JSON.parse(measurementRequest.postData() ?? "{}")).toEqual({ page: "home", visit: true });
  expect((await measurementRequest.response())?.status()).toBe(204);
  const secondMeasurement = visitorPage.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname === "/api/traffic",
  );
  await visitorPage.goto(`${baseURL}${pagePath(testInfo, "wishlistCreate")}`);
  expect((await secondMeasurement).status()).toBe(204);
  const created = await createWishlistViaApi(visitorPage, ["Private wish"]);
  await createDrawViaApi(visitorPage);
  await expect.poll(async () => {
    const traffic = await mockTraffic();
    return {
      pageViews: traffic.reduce((total, row) => total + row.page_view_count, 0),
      visits: traffic.reduce((total, row) => total + row.visit_count, 0),
    };
  }).toEqual({ pageViews: 2, visits: 1 });
  await expect.poll(async () => mockCountryTraffic()).toEqual([
    expect.objectContaining({
      site: locale,
      country: expectedCountry,
      page_view_count: 2,
      visit_count: 1,
    }),
  ]);
  await visitorPage.goto(rebase(created.guestUrl, baseURL));
  await expect(visitorPage.getByRole("heading", { name: "Synthetic list" })).toBeVisible();
  await visitor.close();
  expect(created.guestUrl).toContain("#token=");

  // A browser that opens /admin is removed again, even after first landing on the public homepage.
  const adminCountry = expectedCountry === "NL" ? "BE" : "DE";
  const adminVisitor = await browser.newContext({
    extraHTTPHeaders: { "x-vercel-ip-country": adminCountry },
  });
  const adminVisitorPage = await adminVisitor.newPage();
  await adminVisitorPage.goto(`${baseURL}/`);
  await expect.poll(async () => (await mockTraffic()).reduce((total, row) => total + row.page_view_count, 0)).toBe(3);
  await adminVisitorPage.goto(`${baseURL}/admin`);
  await expect(adminVisitorPage.getByLabel(t("admin.login.password"))).toBeVisible();
  await expect.poll(async () => {
    const traffic = await mockTraffic();
    return {
      pageViews: traffic.reduce((total, row) => total + row.page_view_count, 0),
      visits: traffic.reduce((total, row) => total + row.visit_count, 0),
      countries: (await mockCountryTraffic()).map(({ country }) => country),
    };
  }).toEqual({ pageViews: 2, visits: 1, countries: [expectedCountry] });
  await adminVisitor.close();

  await page.goto("/admin");
  await page.getByLabel(t("admin.login.password")).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: t("admin.login.submit") }).click();
  await page.getByRole("link", { name: t("admin.nav.usage") }).click();
  await expect(page).toHaveURL(/\/admin\/usage$/);

  const last30Days = page.locator('[data-period="30"]');
  await expect(last30Days.locator('[data-event="wishlist_created"]')).toHaveText("1");
  await expect(last30Days.locator('[data-event="shared_wishlist_opened"]')).toHaveText("1");
  await expect(last30Days.locator('[data-event="draw_created"]')).toHaveText("1");
  await expect(last30Days.locator('[data-event="participant_links_issued"]')).toHaveText("4");
  await expect(last30Days.locator('[data-event="admin_login"]')).toHaveText("1");
  await expect(page.locator('[data-traffic-total="visits"]')).toHaveText("1");
  await expect(page.locator('[data-traffic-total="pageViews"]')).toHaveText("2");
  await expect(page.locator(`[data-traffic-page="home"]`)).toBeVisible();
  await expect(page.locator(`[data-traffic-page="wishlistCreate"]`)).toBeVisible();
  await expect(page.locator(`[data-country="OTHER"][data-country-site="${locale}"]`)).toBeVisible();
  await expect(page.locator(`[data-country="${expectedCountry}"]`)).toHaveCount(0);
  await expect(page.locator('[data-stock="wishlists"]')).toHaveText("1");
  await expect(page.locator('[data-stock="draws"]')).toHaveText("1");

  // No user content appears anywhere on the page.
  const text = await page.locator("main, body").first().innerText();
  for (const secret of ["Private wish", "Synthetic list", "Alex", "Noor"]) expect(text).not.toContain(secret);
  await expectNoAxeViolations(page, "usage dashboard");
});
