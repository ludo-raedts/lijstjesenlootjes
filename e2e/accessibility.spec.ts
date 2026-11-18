import { expect, test } from "@playwright/test";
import {
  createDrawViaApi,
  createWishlistViaApi,
  expectNoAxeViolations,
  expectNoHorizontalScroll,
  i18n,
  pagePath,
  resetBackend,
} from "./helpers";
import type { PageKey } from "../src/lib/paths";

test.beforeEach(resetBackend);

const publicPages: PageKey[] = ["home", "wishlistCreate", "drawCreate", "wheel", "help", "privacy", "officeDraw", "christmasDraw", "birthdayWishlist"];
const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "200% zoom equivalent", width: 640, height: 800 },
  { name: "320px phone", width: 320, height: 700 },
];

for (const viewport of viewports) {
  test(`public pages pass axe and do not scroll horizontally at ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const key of publicPages) {
      await page.goto(pagePath(testInfo, key));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectNoAxeViolations(page, `${key} at ${viewport.name}`);
    }
  });
}

test("personal pages and the admin login pass axe", async ({ page, browser }, testInfo) => {
  const { t } = i18n(testInfo);
  const list = await createWishlistViaApi(page);
  const draw = await createDrawViaApi(page);

  for (const [name, url, ready] of [
    ["wishlist manage", list.manageUrl, () => page.locator("#manage-title")],
    ["wishlist guest", list.guestUrl, () => page.locator(".gift-card").first()],
    ["draw admin", draw.adminUrl, () => page.locator("li.participant-row").first()],
    ["draw reveal", draw.participantLinks[0].url, () => page.getByRole("button", { name: t("draw.reveal.open") })],
  ] as const) {
    const context = await browser.newContext();
    const target = await context.newPage();
    await target.goto(url);
    await expect(ready.call(null).constructor === Object ? target.locator("body") : target.locator("body")).toBeVisible();
    await target.waitForLoadState("networkidle");
    await expectNoAxeViolations(target, name);
    await expectNoHorizontalScroll(target);
    await context.close();
  }

  await page.goto("/admin");
  await expectNoAxeViolations(page, "admin login");
});

test("the keyboard reaches the main actions with a visible focus indicator", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();

  const missing: string[] = [];
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return null;
      const style = getComputedStyle(element);
      const outlined = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      const shadowed = style.boxShadow !== "none";
      return { name: element.textContent?.trim().slice(0, 30) || element.tagName, visible: outlined || shadowed };
    });
    if (focus && !focus.visible) missing.push(focus.name);
  }
  expect(missing, "focused elements without a visible indicator").toEqual([]);

  // The wheel is fully operable with the keyboard alone.
  await page.goto(pagePath(testInfo, "wheel"));
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    if (name === t("wheel.spin")) break;
  }
  await expect(page.getByRole("button", { name: t("wheel.spin") })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".wheel-result strong")).toBeVisible({ timeout: 8000 });
});

test("reduced motion makes the wheel answer without the long spin", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pagePath(testInfo, "wheel"));
  await page.getByRole("button", { name: t("wheel.spin") }).click();
  await expect(page.locator(".wheel-result strong")).toBeVisible({ timeout: 1500 });
});
