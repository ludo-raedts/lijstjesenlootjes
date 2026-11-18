import { expect, test, type Page } from "@playwright/test";
import { browserFetch, expectNoAxeViolations, i18n, linksIn, mockMails, mockState, rebase, resetBackend } from "./helpers";

test.beforeEach(resetBackend);

const API = "http://127.0.0.1:3100";
const CRON = "e2e-test-cron-secret-0123456789abcdef";
const ORGANIZER = "organizer@example.test";
const NAMES = ["Alex", "Sam", "Kim", "Noor"];

async function post(page: Page, path: string, body: unknown) {
  const response = await browserFetch(page, path, { method: "POST", body });
  return { status: response.status, json: JSON.parse(response.text) as Record<string, unknown> };
}

async function createDraw(page: Page, extra: Record<string, unknown> = {}) {
  const created = await post(page, "/api/draws", {
    requestId: crypto.randomUUID(),
    organizerName: "Alex",
    participants: NAMES.map((name, index) => ({ id: `p${index}`, name })),
    exclusions: [],
    ...extra,
  });
  expect(created.status).toBe(201);
  return created.json as { adminUrl: string; participantLinks: Array<{ name: string; url: string }> };
}

/** Today in Europe/Amsterdam plus some days, as YYYY-MM-DD. */
function amsterdamDay(offsetDays: number) {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

test("the organizer adds and removes people and draws again; the note reaches everyone", async ({ page, browser, baseURL }, testInfo) => {
  const { t } = i18n(testInfo);
  const draw = await createDraw(page, { note: "Unwrapping at seven" });
  const links = draw.participantLinks.map((link) => ({ ...link, url: rebase(link.url, baseURL) }));

  // A participant sees the note before opening the draw.
  const samContext = await browser.newContext();
  const sam = await samContext.newPage();
  await sam.goto(links.find((link) => link.name === "Sam")!.url);
  await expect(sam.locator(".draw-note")).toHaveText("Unwrapping at seven");

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto(rebase(draw.adminUrl, baseURL));
  await expect(admin.locator("li.participant-row")).toHaveCount(4);

  // Edit the note.
  await admin.locator("#draw-admin-note").fill("Unwrapping at eight");
  await admin.getByRole("button", { name: t("draw.admin.noteSave") }).click();
  await expect(admin.getByRole("status").filter({ hasText: t("draw.admin.noteSaved") })).toBeVisible();

  // Add Eve: everyone is drawn again and Eve gets a link.
  await admin.locator("#draw-admin-add").fill("Eve");
  admin.once("dialog", (dialog) => dialog.accept());
  await admin.getByRole("button", { name: t("draw.admin.addSubmit") }).click();
  await expect(admin.locator("li.participant-row")).toHaveCount(5);
  await expect(admin.getByRole("status").filter({ hasText: t("draw.admin.redrawDone") })).toBeVisible();
  const eveLink = rebase((await admin.locator(".admin-block .link-box code").first().innerText()).trim(), baseURL);

  const eveContext = await browser.newContext();
  const eve = await eveContext.newPage();
  await eve.goto(eveLink);
  await eve.getByRole("button", { name: t("draw.reveal.open") }).click();
  await expect(eve.locator(".recipient-name")).toBeVisible();

  // Sam's existing link still works, shows the redraw notice and the new note.
  await sam.reload();
  await expect(sam.locator(".notice.warning[role=status]")).toBeVisible();
  await expect(sam.locator(".draw-note")).toHaveText("Unwrapping at eight");

  // Remove Kim: her old link stops working and the draw stays valid for the rest.
  admin.once("dialog", (dialog) => dialog.accept());
  await admin.locator("li.participant-row", { hasText: "Kim" }).getByRole("button", { name: t("draw.admin.removeLabel", { name: "Kim" }) }).click();
  await expect(admin.locator("li.participant-row")).toHaveCount(4);
  const kimContext = await browser.newContext();
  const kim = await kimContext.newPage();
  await kim.goto(links.find((link) => link.name === "Kim")!.url);
  await expect(kim.locator(".link-problem")).toBeVisible();

  const { data } = await mockState();
  const stored = (data.draws as Array<{ participants: Array<{ id: string }>; assignments: Array<{ giverId: string; recipientId: string }> }>)[0];
  expect(stored.participants).toHaveLength(4);
  expect(stored.assignments).toHaveLength(4);
  expect(stored.assignments.every((a) => a.giverId !== a.recipientId)).toBe(true);
  expect(new Set(stored.assignments.map((a) => a.recipientId)).size).toBe(4);
  await expectNoAxeViolations(admin, "draw admin with people, note and reminder blocks");

  // With three people left nobody can be removed any more.
  admin.once("dialog", (dialog) => dialog.accept());
  await admin.locator("li.participant-row", { hasText: "Noor" }).getByRole("button", { name: t("draw.admin.removeLabel", { name: "Noor" }) }).click();
  await expect(admin.locator("li.participant-row")).toHaveCount(3);
  await expect(admin.getByRole("button", { name: t("draw.admin.remove") })).toHaveCount(0);
});

test("a one-off reminder is sent on its day, only if someone has not looked, and wipes the address", async ({ page, browser, baseURL, request }, testInfo) => {
  const { t } = i18n(testInfo);
  const draw = await createDraw(page, { date: amsterdamDay(3) });
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto(rebase(draw.adminUrl, baseURL));
  await expect(admin.locator("#reminder-email")).toBeVisible();
  await admin.locator("#reminder-email").fill(ORGANIZER);
  await admin.getByRole("button", { name: t("draw.admin.reminderSet") }).click();
  await expect(admin.getByRole("button", { name: t("draw.admin.reminderClear") })).toBeVisible();

  const state = JSON.stringify((await mockState()).data);
  expect(state).not.toContain(ORGANIZER);
  expect(state).toContain("emailSealed");

  const cron = await request.get(`${API}/api/cron/reminders`, { headers: { authorization: `Bearer ${CRON}` } });
  expect(cron.status()).toBe(200);
  expect(await cron.json()).toMatchObject({ sent: 1 });
  await expect.poll(async () => (await mockMails()).length).toBe(1);
  const mail = (await mockMails())[0];
  expect(mail.to).toEqual([ORGANIZER]);
  expect(linksIn(mail.text)).toHaveLength(1);
  expect(mail.text).toContain("4");
  expect(JSON.stringify((await mockState()).data)).not.toContain("emailSealed");

  // A second run sends nothing more.
  await request.get(`${API}/api/cron/reminders`, { headers: { authorization: `Bearer ${CRON}` } });
  expect(await mockMails()).toHaveLength(1);
});

test("no reminder mail goes out when everyone has already looked; a reminder needs a future date", async ({ page, browser, baseURL, request }, testInfo) => {
  const { t } = i18n(testInfo);
  const draw = await createDraw(page, { date: amsterdamDay(3) });
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto(rebase(draw.adminUrl, baseURL));
  await admin.locator("#reminder-email").fill(ORGANIZER);
  await admin.getByRole("button", { name: t("draw.admin.reminderSet") }).click();
  await expect(admin.getByRole("button", { name: t("draw.admin.reminderClear") })).toBeVisible();

  for (const link of draw.participantLinks) {
    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto(rebase(link.url, baseURL));
    await visitor.getByRole("button", { name: t("draw.reveal.open") }).click();
    await expect(visitor.locator(".recipient-name")).toBeVisible();
  }
  const cron = await request.get(`${API}/api/cron/reminders`, { headers: { authorization: `Bearer ${CRON}` } });
  expect(await cron.json()).toMatchObject({ sent: 0 });
  expect(await mockMails()).toHaveLength(0);
  expect(JSON.stringify((await mockState()).data)).not.toContain("emailSealed");

  // Without a date there is nothing to remind about.
  const undated = await createDraw(page);
  const undatedContext = await browser.newContext();
  const undatedAdmin = await undatedContext.newPage();
  await undatedAdmin.goto(rebase(undated.adminUrl, baseURL));
  await expect(undatedAdmin.getByText(t("draw.admin.reminderNeedsDate"))).toBeVisible();
});

test("a wishlist can have extra management links that can be revoked", async ({ page, browser, baseURL }, testInfo) => {
  const { t } = i18n(testInfo);
  const list = await post(page, "/api/wishlists", { title: "Family list", wishes: [{ title: "Thermos flask" }] });
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await owner.goto(rebase(list.json.manageUrl as string, baseURL));
  await expect(owner.locator("#manage-title")).toBeVisible();

  await owner.locator("#manager-label").fill("Partner");
  await owner.getByRole("button", { name: t("wishlist.manage.managerCreate") }).click();
  const url = rebase((await owner.locator("#managers-title ~ .notice code").innerText()).trim(), baseURL);
  await expect(owner.locator("li.participant-row", { hasText: "Partner" })).toBeVisible();

  const partnerContext = await browser.newContext();
  const partner = await partnerContext.newPage();
  await partner.goto(url);
  await expect(partner.locator("#manage-title")).toHaveValue("Family list");
  await expectNoAxeViolations(owner, "wishlist manage with co-managers");

  owner.once("dialog", (dialog) => dialog.accept());
  await owner.locator("li.participant-row", { hasText: "Partner" }).getByRole("button", { name: t("wishlist.manage.managerRevoke") }).click();
  await expect(owner.locator("li.participant-row", { hasText: "Partner" })).toHaveCount(0);

  await partner.reload();
  await expect(partner.locator(".link-problem")).toBeVisible();
  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto(url);
  await expect(fresh.locator(".link-problem")).toBeVisible();
});

test("a linked wishlist that is deleted is reported to the participant", async ({ page, browser, baseURL }, testInfo) => {
  const { t } = i18n(testInfo);
  const list = await post(page, "/api/wishlists", { title: "Soon gone", wishes: [{ title: "Thermos flask" }] });
  const draw = await createDraw(page);
  const samLink = draw.participantLinks.find((link) => link.name === "Sam")!;
  const samContext = await browser.newContext();
  const sam = await samContext.newPage();
  await sam.goto(rebase(samLink.url, baseURL));
  await sam.getByRole("button", { name: t("draw.reveal.open") }).click();
  await sam.locator("#link-wishlist-input").fill(list.json.guestUrl as string);
  await sam.getByRole("button", { name: t("draw.reveal.linkSubmit") }).click();
  await expect(sam.getByText(t("draw.reveal.linked", { title: "Soon gone" }))).toBeVisible();

  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await owner.goto(rebase(list.json.manageUrl as string, baseURL));
  await expect(owner.locator("#manage-title")).toBeVisible();
  expect((await browserFetch(owner, "/api/wishlists/manage", { method: "DELETE", body: {} })).status).toBe(200);

  await sam.reload();
  await sam.getByRole("button", { name: t("draw.reveal.open") }).click();
  await expect(sam.getByText(t("draw.reveal.linkedMissing"))).toBeVisible();
  await sam.getByRole("button", { name: t("draw.reveal.unlink") }).click();
  await expect(sam.locator("#link-wishlist-input")).toBeVisible();
});
