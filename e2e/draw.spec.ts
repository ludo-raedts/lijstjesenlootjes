import { expect, test, type Page } from "@playwright/test";
import { i18n, mockState, pagePath, rebase, resetBackend } from "./helpers";

test.beforeEach(resetBackend);

test("draw with an exclusion and duplicate names, personal links, wishes, link replacement and deletion", async ({ page, browser, baseURL }, testInfo) => {
  const { t } = i18n(testInfo);

  // Create: organizer Alex, two people named Sam, and Kim; Alex must not draw Kim.
  await page.goto(pagePath(testInfo, "drawCreate"));
  await page.locator("#organizer").fill("Alex");
  await page.locator("#participant-participant-1").fill("Sam");
  await page.locator("#participant-participant-2").fill("Sam");
  await page.getByRole("button", { name: t("draw.create.addParticipant") }).click();
  await page.getByLabel(t("draw.create.participantLabel", { number: 4 }), { exact: true }).fill("Kim");

  await page.locator("details.exclusions > summary").click();
  await page.locator("summary", { hasText: t("draw.create.exclusionPerson", { name: "Alex" }) }).click();
  await page.locator("details.exclusion-person", { hasText: t("draw.create.exclusionPerson", { name: "Alex" }) })
    .locator("label.exclusion-row", { hasText: "Kim" }).locator("input").check();

  const created = page.waitForResponse((response) => response.url().endsWith("/api/draws") && response.request().method() === "POST");
  await page.getByRole("button", { name: t("draw.create.submit") }).click();
  const body = await (await created).json() as { adminUrl: string; participantLinks: Array<{ name: string; url: string }> };
  await expect(page.getByRole("heading", { name: t("draw.create.completeTitle") })).toBeVisible();
  const adminUrl = rebase(body.adminUrl, baseURL);
  const participantLinks = body.participantLinks.map((link) => ({ ...link, url: rebase(link.url, baseURL) }));
  expect(participantLinks.map((link) => link.name).sort()).toEqual(["Alex", "Kim", "Sam", "Sam"]);

  // Every participant opens their own link in a private context and saves a wish.
  type Visitor = { name: string; url: string; page: Page; recipient: string };
  const visitors: Visitor[] = [];
  for (const link of participantLinks) {
    const context = await browser.newContext();
    const visitorPage = await context.newPage();
    await visitorPage.goto(link.url);
    await expect(visitorPage.getByRole("heading", { name: t("draw.reveal.hello", { name: link.name }) })).toBeVisible();
    await expect(visitorPage).toHaveURL((url) => !url.hash.includes("token"));
    await visitorPage.getByRole("button", { name: t("draw.reveal.open") }).click();
    const recipient = (await visitorPage.locator(".recipient-name").innerText()).trim();
    expect(recipient).not.toEqual("");
    await visitorPage.locator(".own-wishlist #wish-title-0").fill(`Wish of ${link.name}`);
    await visitorPage.getByRole("button", { name: t("draw.reveal.save") }).click();
    await expect(visitorPage.getByRole("status").filter({ hasText: t("draw.reveal.saved") })).toBeVisible();
    visitors.push({ name: link.name, url: link.url, page: visitorPage, recipient });
  }

  // Constraints hold: nobody draws themselves, and Alex did not draw Kim.
  const alex = visitors.find((visitor) => visitor.name === "Alex")!;
  const kim = visitors.find((visitor) => visitor.name === "Kim")!;
  expect(alex.recipient).toBe("Sam");
  expect(kim.recipient).not.toBe("Kim");

  // The giver sees the recipient's wishes after refreshing; nothing is reservable.
  for (const visitor of visitors) {
    await visitor.page.getByRole("button", { name: t("draw.reveal.refresh") }).click();
    await expect(visitor.page.locator(".recipient-wishlist")).toContainText(`Wish of ${visitor.recipient}`);
    await expect(visitor.page.locator(".recipient-wishlist").getByRole("button", { name: /reserv/i })).toHaveCount(0);
  }

  // A reload keeps the session and reports that it was viewed before.
  await alex.page.reload();
  await expect(alex.page.getByText(t("draw.reveal.viewedBefore"))).toBeVisible();

  // The organizer replaces Kim's lost link; the old link stops working, the new one shows the same recipient.
  const organizer = await browser.newContext();
  const adminPage = await organizer.newPage();
  await adminPage.goto(adminUrl);
  await expect(adminPage.getByRole("heading", { name: t("draw.admin.defaultTitle"), exact: true })).toBeVisible();
  const kimRow = adminPage.locator("li.participant-row", { hasText: "Kim" });
  adminPage.once("dialog", (dialog) => dialog.accept());
  await kimRow.getByRole("button", { name: t("draw.admin.replace") }).click();
  const replacement = rebase((await kimRow.locator(".link-box code").innerText()).trim(), baseURL);
  expect(replacement).toContain("#token=");

  const staleContext = await browser.newContext();
  const stalePage = await staleContext.newPage();
  await stalePage.goto(kim.url);
  await expect(stalePage.locator(".notice.error")).toBeVisible();

  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto(replacement);
  await freshPage.getByRole("button", { name: t("draw.reveal.open") }).click();
  await expect(freshPage.locator(".recipient-name")).toHaveText(kim.recipient);

  // Deleting the draw physically removes it with all access records.
  adminPage.once("dialog", (dialog) => dialog.accept());
  await adminPage.getByRole("button", { name: t("draw.admin.delete") }).click();
  await expect(adminPage.getByRole("status").filter({ hasText: t("draw.admin.deletedTitle") })).toBeVisible();
  const { data } = await mockState();
  expect(data.draws).toHaveLength(0);
  expect(data.accessTokens).toHaveLength(0);
  expect(data.sessions).toHaveLength(0);

  await alex.page.reload();
  await expect(alex.page.locator(".notice.error")).toBeVisible();
});

test("a draw needs at least three participants", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.goto(pagePath(testInfo, "drawCreate"));
  await page.locator("#organizer").fill("Alex");
  await page.locator("#participant-participant-1").fill("Sam");
  await expect(page.getByRole("button", { name: t("draw.create.submit") })).toBeDisabled();
  await page.locator("#participant-participant-2").fill("Kim");
  await expect(page.getByRole("button", { name: t("draw.create.submit") })).toBeEnabled();
});

test("an impossible exclusion set is rejected without storing a draw", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.goto(pagePath(testInfo, "drawCreate"));
  await page.locator("#organizer").fill("Alex");
  await page.locator("#participant-participant-1").fill("Sam");
  await page.locator("#participant-participant-2").fill("Kim");
  await page.locator("details.exclusions > summary").click();
  const alexGroup = page.locator("details.exclusion-person", { hasText: t("draw.create.exclusionPerson", { name: "Alex" }) });
  await alexGroup.locator("summary").click();
  await alexGroup.locator("label.exclusion-row", { hasText: "Sam" }).locator("input").check();
  await alexGroup.locator("label.exclusion-row", { hasText: "Kim" }).locator("input").check();
  await page.getByRole("button", { name: t("draw.create.submit") }).click();
  await expect(page.locator(".notice.error")).toBeVisible();
  expect((await mockState()).data.draws).toHaveLength(0);
});
