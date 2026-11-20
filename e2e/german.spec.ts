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

// German strings run longer than Dutch and English (LOCALIZATION.md asks for 35% expansion), so the German pages are
// checked on a 320 px phone: nothing may force a horizontal scroll.
test("German pages do not overflow a 320 px screen", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.context().addCookies([{ name: "ll_locale", value: "de", url: testInfo.project.use.baseURL! }]);
  const targets = [pagePath(testInfo, "home"), pagePath(testInfo, "drawCreate"), pagePath(testInfo, "wishlistCreate"),
    pagePath(testInfo, "wheel"), pagePath(testInfo, "drawTogether"), pagePath(testInfo, "recover"), "/privacy", "/help"];
  for (const target of targets) {
    await page.goto(target);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${target} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});


test("German draw-together steps do not overflow a 320 px screen, even with long names", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.context().addCookies([{ name: "ll_locale", value: "de", url: testInfo.project.use.baseURL! }]);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.goto(pagePath(testInfo, "drawTogether"));
  const longName = "Wolfgang-Maximilian-Alexander";
  await page.getByLabel("Namen *").fill(`${longName}\nFatima\nNoor`);
  await page.getByRole("button", { name: "Auslosung starten" }).click();
  for (const name of [longName, "Fatima", "Noor"]) {
    await page.getByRole("button", { name: `Ich bin ${name}` }).click();
    expect(await overflow()).toBeLessThanOrEqual(0);
    const yes = page.getByRole("button", { name: `Ja, ich bin ${name}` });
    await expect(yes).toBeEnabled();
    await yes.click();
    expect(await overflow()).toBeLessThanOrEqual(0);
    const hide = page.getByRole("button", { name: "Ich habe es mir gemerkt, verbergen" });
    await expect(hide).toBeEnabled();
    await hide.click();
  }
  await expect(page.getByRole("heading", { name: "Alle haben gelost" })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
});
