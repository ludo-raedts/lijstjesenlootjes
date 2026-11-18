import { expect, test } from "@playwright/test";
import { browserFetch, i18n, label, mockState, pagePath, rebase, resetBackend } from "./helpers";

test.beforeEach(resetBackend);

test("create, edit, share, reserve, release and delete a wishlist", async ({ page, browser, baseURL }, testInfo) => {
  const { locale, t } = i18n(testInfo);

  // Create
  await page.goto(pagePath(testInfo, "wishlistCreate"));
  await page.locator("#list-title").fill("Synthetic birthday list");
  await page.locator("#wish-title-0").fill("Thermos flask");
  await page.getByRole("button", { name: t("wishes.add") }).click();
  await page.locator("#wish-title-1").fill("Garden book");
  await page.locator("#wish-url-1").fill("https://example.org/garden-book");
  await page.getByRole("button", { name: t("wishlist.create.submit") }).click();
  await expect(page.getByRole("heading", { name: t("wishlist.create.successTitle") })).toBeVisible();

  const [rawManageUrl, rawGuestUrl] = await page.locator(".link-box code").allTextContents();
  const manageUrl = rebase(rawManageUrl, baseURL);
  const guestUrl = rebase(rawGuestUrl, baseURL);
  expect(manageUrl).toContain("#token=");
  expect(guestUrl).toContain("#token=");
  expect(manageUrl).not.toEqual(guestUrl);

  // Manage: the token leaves the address bar, the session survives a reload, edits are saved.
  const manager = await browser.newContext();
  const managePage = await manager.newPage();
  await managePage.goto(manageUrl);
  await expect(managePage.locator("#manage-title")).toHaveValue("Synthetic birthday list");
  await expect(managePage).toHaveURL((url) => !url.hash.includes("token"));
  await managePage.locator("#manage-title").fill("Synthetic list, edited");
  await managePage.locator("#wish-title-0").fill("Thermos flask (blue)");
  await managePage.getByRole("button", { name: t("wishlist.manage.save") }).click();
  await expect(managePage.getByRole("status").filter({ hasText: t("wishlist.manage.saved") })).toBeVisible();
  await managePage.reload();
  await expect(managePage.locator("#manage-title")).toHaveValue("Synthetic list, edited");

  // The owner never sees who reserved what.
  const managed = await browserFetch(managePage, "/api/wishlists/manage");
  expect(managed.status).toBe(200);
  expect(managed.text).not.toContain("reserv");

  // Guest reserves; the reservation survives a reload and is visible to another guest.
  const guestA = await browser.newContext();
  const guestPageA = await guestA.newPage();
  await guestPageA.goto(guestUrl);
  await expect(guestPageA.getByRole("heading", { name: "Synthetic list, edited" })).toBeVisible();
  await expect(guestPageA.locator("a[href='https://example.org/garden-book']")).toBeVisible();

  const firstCard = guestPageA.locator(".gift-card", { hasText: "Thermos flask (blue)" });
  const amazon = firstCard.locator("a[href*='amazon.']");
  if (locale === "en") {
    await expect(amazon).toHaveAttribute("rel", /sponsored/);
    await expect(amazon).toHaveAttribute("href", /tag=wishanddraw-20/);
  } else {
    await expect(amazon).toHaveCount(0);
  }
  await expect(guestPageA.locator(".gift-card", { hasText: "Garden book" }).locator("a[href*='amazon.']")).toHaveCount(0);
  const bolSearch = firstCard.getByRole("link", {
    name: t("affiliate.bol.searchLabel", { title: "Thermos flask (blue)" }),
  });
  if (locale === "nl") {
    await expect(bolSearch).toHaveAttribute("rel", /sponsored/);
    await expect(bolSearch).toHaveAttribute("href", /s=1560649/);
  } else {
    await expect(bolSearch).toHaveCount(0);
  }

  await firstCard.getByRole("button", { name: t("wishlist.guest.reserve") }).click();
  await expect(firstCard.getByText(t("wishlist.guest.reservedByYou"))).toBeVisible();
  await guestPageA.reload();
  await expect(guestPageA.locator(".gift-card", { hasText: "Thermos flask (blue)" }).getByText(t("wishlist.guest.reservedByYou"))).toBeVisible();

  const guestB = await browser.newContext();
  const guestPageB = await guestB.newPage();
  await guestPageB.goto(guestUrl);
  const cardForB = guestPageB.locator(".gift-card", { hasText: "Thermos flask (blue)" });
  await expect(cardForB.getByText(t("wishlist.guest.reserved"), { exact: true })).toBeVisible();
  await expect(cardForB.getByRole("button")).toHaveCount(0);

  // Release makes it available for others again.
  await guestPageA.locator(".gift-card", { hasText: "Thermos flask (blue)" }).getByRole("button", { name: t("wishlist.guest.release") }).click();
  await guestPageB.reload();
  await expect(guestPageB.locator(".gift-card", { hasText: "Thermos flask (blue)" }).getByRole("button", { name: t("wishlist.guest.reserve") })).toBeVisible();

  // Delete removes the list, its tokens and sessions from storage.
  managePage.once("dialog", (dialog) => dialog.accept());
  await managePage.getByRole("button", { name: t("wishlist.manage.delete") }).click();
  await expect(managePage.getByRole("status").filter({ hasText: t("wishlist.manage.deleted") })).toBeVisible();
  const { data } = await mockState();
  expect(data.wishlists).toHaveLength(0);
  expect(data.accessTokens).toHaveLength(0);
  expect(data.sessions).toHaveLength(0);

  await guestPageB.reload();
  await expect(guestPageB.locator(".notice.error")).toBeVisible();

  await Promise.all([manager.close(), guestA.close(), guestB.close()]);
});

test("a wishlist needs at least a title and one wish", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.goto(pagePath(testInfo, "wishlistCreate"));
  await page.getByRole("button", { name: t("wishlist.create.submit") }).click();
  await expect(page.locator("#list-title")).toBeFocused();
  expect((await mockState()).data.wishlists).toHaveLength(0);
  expect(label(t, "wishes.titleLabel")).toBeTruthy();
});
