import { expect, test } from "@playwright/test";
import { i18n, resetBackend } from "./helpers";

test.beforeEach(resetBackend);

test("the domain decides the default language", async ({ page }, testInfo) => {
  const { locale } = i18n(testInfo);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
});
