import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, pagePath } from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("German can be chosen from the language switcher and stays on the page", async ({ page }, testInfo) => {
  await page.goto(pagePath(testInfo, "drawCreate"));
  await page.locator(".language-links:visible").getByRole("button", { name: "DE" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Wichtel");
  await expect(page.getByRole("button", { name: "Prüfen und auslosen" })).toBeVisible();
  await expect(page.locator(".language-links:visible [aria-current]")).toHaveText("DE");
  await expectNoAxeViolations(page, "German draw page");

  // The choice follows the visitor to the other tools, and the Dutch/English links still lead to their domains.
  await page.goto(pagePath(testInfo, "wishlistCreate"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Wunschzettel");
  await expect(page.locator(".language-links:visible a")).toHaveCount(2);
});

test("a German visitor sees the recovery page in German", async ({ page }, testInfo) => {
  await page.context().addCookies([{ name: "ll_locale", value: "de", url: new URL(page.url() === "about:blank" ? testInfo.project.use.baseURL! : page.url()).origin }]);
  await page.goto(pagePath(testInfo, "recover"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Verwaltungslink verloren?");
  await expectNoAxeViolations(page, "German recovery page");
});
