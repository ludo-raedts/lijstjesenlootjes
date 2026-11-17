import { expect, test, type Page } from "@playwright/test";
import { browserFetch, expectNoAxeViolations, i18n, linksIn, mockMails, mockState, pagePath, rebase, resetBackend } from "./helpers";

test.beforeEach(resetBackend);

const ORGANIZER = "organizer@example.test";
const STRANGER = "nobody@example.test";
const PLAIN = "plain@example.test";

async function post(page: Page, path: string, body: unknown) {
  const response = await browserFetch(page, path, { method: "POST", body });
  return { status: response.status, json: JSON.parse(response.text) as Record<string, unknown> };
}

async function waitForMails(count: number) {
  await expect.poll(async () => (await mockMails()).length, { timeout: 15_000 }).toBe(count);
  return mockMails();
}

test("mail is sent after the response, its status shows on the page, and recovery mails new working links", async ({ page, browser, baseURL }, testInfo) => {
  const { t } = i18n(testInfo);
  const rb = (value: unknown) => rebase(value as string, baseURL);

  const created = await post(page, "/api/wishlists", { title: "Synthetic list", wishes: [{ title: "Thermos flask" }], email: ORGANIZER, recoverable: true });
  expect(created.status).toBe(201);
  expect(created.json.emailStatus).toBe("queued");
  const plain = await post(page, "/api/wishlists", { title: "No recovery", wishes: [{ title: "Socks" }], email: PLAIN });
  expect(plain.status).toBe(201);

  // The creation mails go out in the background and carry the links.
  const first = await waitForMails(2);
  const original = first.find((mail) => mail.to.includes(ORGANIZER))!;
  expect(linksIn(original.text)).toHaveLength(2);

  // The management page reports the delivery state, not the address.
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await owner.goto(rb(created.json.manageUrl));
  await expect(owner.locator("#manage-title")).toBeVisible();
  const prefix = t("mailPanel.status.sent", { date: "@@" }).split("@@")[0].trim();
  await expect(owner.locator(".mail-panel p[role=status]")).toContainText(prefix);
  await expectNoAxeViolations(owner, "wishlist manage with mail panel");
  expect(JSON.stringify((await mockState()).data)).not.toContain(ORGANIZER);

  // Recovery answers the same for known and unknown addresses, and only mails when there is a match.
  const stranger = await post(page, "/api/recovery", { email: STRANGER });
  const known = await post(page, "/api/recovery", { email: ORGANIZER });
  const withoutOptIn = await post(page, "/api/recovery", { email: PLAIN });
  for (const result of [stranger, known, withoutOptIn]) {
    expect(result.status).toBe(202);
    expect(result.json).toEqual({ accepted: true });
  }
  const mails = await waitForMails(3);
  await page.waitForTimeout(1500);
  expect(await mockMails()).toHaveLength(3);
  const recovery = mails[2];
  expect(recovery.to).toEqual([ORGANIZER]);
  const [manageLink, guestLink] = linksIn(recovery.text).map((link) => rebase(link, baseURL));
  expect(manageLink).not.toBe(rb(created.json.manageUrl));

  // New links work, and the old management link keeps working: recovery only adds access.
  const freshContext = await browser.newContext();
  const fresh = await freshContext.newPage();
  await fresh.goto(manageLink);
  await expect(fresh.locator("#manage-title")).toHaveValue("Synthetic list");
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(guestLink);
  await expect(guest.getByRole("heading", { name: "Synthetic list" })).toBeVisible();
  await owner.reload();
  await expect(owner.locator("#manage-title")).toHaveValue("Synthetic list");
});

test("the organizer of a wishlist can mail a fresh link and opt in to recovery later", async ({ page, browser, baseURL }, testInfo) => {
  const { t } = i18n(testInfo);
  const created = await post(page, "/api/wishlists", { title: "Synthetic list", wishes: [{ title: "Thermos flask" }] });
  const context = await browser.newContext();
  const owner = await context.newPage();
  await owner.goto(rebase(created.json.manageUrl as string, baseURL));
  await expect(owner.locator("#manage-title")).toBeVisible();
  await expect(owner.locator(".mail-panel p[role=status]")).toHaveText(t("mailPanel.status.none"));

  await owner.locator("#mail-panel-email").fill(ORGANIZER);
  await owner.getByLabel(t("recover.optIn.label")).check();
  await owner.getByRole("button", { name: t("mailPanel.send") }).click();
  const mails = await waitForMails(1);
  expect(mails[0].to).toEqual([ORGANIZER]);
  expect(linksIn(mails[0].text)).toHaveLength(2);
  await expect(owner.getByText(t("mailPanel.recoverableOn"))).toBeVisible();

  // Opting in now makes recovery work for a list that was created without it.
  expect((await post(page, "/api/recovery", { email: ORGANIZER })).status).toBe(202);
  await waitForMails(2);
});

test("a draw: progress, reminders, a moved date that moves every link, and recovery of the admin link", async ({ page, browser, baseURL }, testInfo) => {
  const { t } = i18n(testInfo);
  const names = ["Alex", "Sam", "Kim", "Noor"];
  const created = await post(page, "/api/draws", {
    requestId: crypto.randomUUID(),
    organizerName: "Alex",
    participants: names.map((name, index) => ({ id: `p${index}`, name })),
    exclusions: [],
    email: ORGANIZER,
    recoverable: true,
  });
  expect(created.status).toBe(201);
  const links = created.json.participantLinks as Array<{ name: string; url: string }>;
  const mail = (await waitForMails(1))[0];
  expect(linksIn(mail.text)).toHaveLength(5);

  const organizerContext = await browser.newContext();
  const admin = await organizerContext.newPage();
  await admin.goto(rebase(created.json.adminUrl as string, baseURL));
  await expect(admin.getByText(t("draw.admin.progress", { viewed: 0, total: 4 }))).toBeVisible();
  await expect(admin.getByRole("button", { name: t("draw.admin.remindCopy"), exact: true })).toHaveCount(4);
  await expect(admin.getByRole("button", { name: t("draw.admin.remindGroupCopy") })).toBeVisible();

  // One participant opens their draw; the organizer sees the progress move on.
  const sam = links.find((link) => link.name === "Sam")!;
  const samContext = await browser.newContext();
  const samPage = await samContext.newPage();
  await samPage.goto(rebase(sam.url, baseURL));
  await samPage.getByRole("button", { name: t("draw.reveal.open") }).click();
  await expect(samPage.locator(".recipient-name")).toBeVisible();
  await admin.reload();
  await expect(admin.getByText(t("draw.admin.progress", { viewed: 1, total: 4 }))).toBeVisible();
  await expect(admin.getByRole("button", { name: t("draw.admin.remindCopy"), exact: true })).toHaveCount(3);
  await expectNoAxeViolations(admin, "draw admin with reminders, date and mail panel");

  // Moving the date moves every live link of the draw with it.
  await admin.locator("#draw-admin-date").fill("2027-06-01");
  await admin.getByRole("button", { name: t("draw.admin.dateSave") }).click();
  await expect(admin.getByRole("status").filter({ hasText: /2027/ })).toBeVisible();
  const { data } = await mockState();
  const expiries = new Set((data.accessTokens as Array<{ role: string; expiresAt: string }>).filter((token) => token.role.startsWith("draw_")).map((token) => token.expiresAt));
  expect([...expiries]).toEqual(["2027-07-16T23:59:59.999Z"]);

  // The admin link can be recovered with the opted-in address.
  expect((await post(page, "/api/recovery", { email: ORGANIZER })).status).toBe(202);
  const recovery = (await waitForMails(2))[1];
  const [adminLink] = linksIn(recovery.text).map((link) => rebase(link, baseURL));
  expect(linksIn(recovery.text)).toHaveLength(1);
  const recoveredContext = await browser.newContext();
  const recovered = await recoveredContext.newPage();
  await recovered.goto(adminLink);
  await expect(recovered.getByText(t("draw.admin.progress", { viewed: 1, total: 4 }))).toBeVisible();
});

test("a participant can link a standalone wishlist; the giver sees its wishes live", async ({ page, browser, baseURL }, testInfo) => {
  const { t } = i18n(testInfo);
  const list = await post(page, "/api/wishlists", { title: "My real list", wishes: [{ title: "Thermos flask" }, { title: "Wool socks" }] });
  const names = ["Alex", "Sam", "Kim", "Noor"];
  const draw = await post(page, "/api/draws", {
    requestId: crypto.randomUUID(),
    organizerName: "Alex",
    participants: names.map((name, index) => ({ id: `p${index}`, name })),
    exclusions: [],
  });
  const links = draw.json.participantLinks as Array<{ name: string; url: string }>;

  const visitors: Array<{ name: string; page: Page; recipient: string }> = [];
  for (const link of links) {
    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto(rebase(link.url, baseURL));
    await visitor.getByRole("button", { name: t("draw.reveal.open") }).click();
    visitors.push({ name: link.name, page: visitor, recipient: (await visitor.locator(".recipient-name").innerText()).trim() });
  }
  const sam = visitors.find((visitor) => visitor.name === "Sam")!;
  const giver = visitors.find((visitor) => visitor.recipient === "Sam")!;

  // A link that is not a live wishlist is refused with a clear message.
  await sam.page.locator("#link-wishlist-input").fill("https://example.test/not-a-list");
  await sam.page.getByRole("button", { name: t("draw.reveal.linkSubmit") }).click();
  await expect(sam.page.locator(".notice.error")).toBeVisible();

  await sam.page.locator("#link-wishlist-input").fill(list.json.guestUrl as string);
  await sam.page.getByRole("button", { name: t("draw.reveal.linkSubmit") }).click();
  await expect(sam.page.getByText(t("draw.reveal.linked", { title: "My real list" }))).toBeVisible();

  await giver.page.getByRole("button", { name: t("draw.reveal.refresh") }).click();
  const recipientWishes = giver.page.locator(".recipient-wishlist");
  await expect(recipientWishes).toContainText("Thermos flask");
  await expect(recipientWishes).toContainText("Wool socks");
  await expect(recipientWishes.getByRole("button", { name: /reserv/i })).toHaveCount(0);

  // Unlinking takes the wishes away again.
  await sam.page.getByRole("button", { name: t("draw.reveal.unlink") }).click();
  await expect(sam.page.locator("#link-wishlist-input")).toBeVisible();
  await giver.page.getByRole("button", { name: t("draw.reveal.refresh") }).click();
  await expect(recipientWishes).not.toContainText("Thermos flask");
});

test("a dead link explains itself and points organizers to the recovery page", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  const fake = `#token=${"x".repeat(43)}`;

  await page.goto(`${pagePath(testInfo, "drawReveal")}${fake}`);
  const participantProblem = page.locator(".link-problem");
  await expect(participantProblem).toContainText(t("linkProblem.invalid.title"));
  await expect(participantProblem).toContainText(t("linkProblem.participant.body"));
  await expect(participantProblem.getByRole("link")).toHaveCount(0);

  await page.goto(`${pagePath(testInfo, "wishlistGuest")}${fake}`);
  await expect(page.locator(".link-problem")).toContainText(t("linkProblem.guest.body"));

  await page.goto(`${pagePath(testInfo, "drawAdmin")}${fake}`);
  const organizerProblem = page.locator(".link-problem");
  await expect(organizerProblem).toContainText(t("linkProblem.organizer.body"));
  await organizerProblem.getByRole("link", { name: t("linkProblem.organizer.action") }).click();
  await expect(page.getByRole("heading", { level: 1, name: t("recover.title") })).toBeVisible();
});

test("the recovery page answers neutrally and passes axe", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.goto(pagePath(testInfo, "recover"));
  await expectNoAxeViolations(page, "recovery page");
  await page.locator("#recover-email").fill(STRANGER);
  await page.getByRole("button", { name: t("recover.submit") }).click();
  await expect(page.getByRole("status").filter({ hasText: t("recover.doneTitle") })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(await mockMails()).toHaveLength(0);
});
