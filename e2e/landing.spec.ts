import { expect, test } from "@playwright/test";
import { browserFetch, i18n, pagePath } from "./helpers";

const pages = [
  { key: "officeDraw", prefix: "office", cta: "drawCreate" },
  { key: "birthdayWishlist", prefix: "birthday", cta: "wishlistCreate" },
  { key: "christmasDraw", prefix: "christmas", cta: "drawCreate" },
] as const;

for (const { key, prefix, cta } of pages) {
  test(`${key}: landing page with steps, tips, questions and a way into the tool`, async ({ page }, testInfo) => {
    const { t, locale } = i18n(testInfo);
    // The Christmas page exists on the Dutch domain only; the English domain sends it to the generator.
    test.skip(key === "christmasDraw" && locale === "en", "Dutch-only page");
    await page.goto(pagePath(testInfo, key));
    await expect(page.getByRole("heading", { level: 1, name: t(`${prefix}.title` as never) })).toBeVisible();
    await expect(page.locator(".seo-content ol li")).toHaveCount(3);
    await expect(page.locator(".seo-content details")).toHaveCount(4);
    await page.locator(".hero-actions a").first().click();
    await expect(page).toHaveURL(new RegExp(`${pagePath(testInfo, cta)}$`));
  });
}

test("the English domain sends the Dutch-only Christmas page to the Secret Santa generator", async ({ page }, testInfo) => {
  test.skip(i18n(testInfo).locale !== "en", "English domain only");
  await page.goto("/kerst-lootjes-trekken");
  await expect(page).toHaveURL(/\/secret-santa-generator$/);
});

test("the new pages are in the sitemap", async ({ page }, testInfo) => {
  const { locale } = i18n(testInfo);
  const body = (await browserFetch(page, "/sitemap.xml")).text;
  expect(body).toContain(pagePath(testInfo, "officeDraw"));
  expect(body).toContain(pagePath(testInfo, "birthdayWishlist"));
  expect(body.includes("kerst-lootjes-trekken")).toBe(locale === "nl");
});
