import { expect, test } from "@playwright/test";
import { i18n, pagePath } from "./helpers";

test("pass the device: each person sees only their own draw, once", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  const requests: string[] = [];
  // Anonymous page-view and speed counters (a page key or a rating, never names) are allowed; nothing else may be sent.
  const isAnonymousCounter = (request: import("@playwright/test").Request) =>
    request.url().endsWith("/api/traffic") ||
    (request.url().endsWith("/api/usage") && /^\{"event":"vitals_[a-z_]+"\}$/.test(request.postData() ?? ""));
  page.on("request", (request) => { if (request.method() !== "GET" && !isAnonymousCounter(request)) requests.push(request.url()); });
  await page.goto(pagePath(testInfo, "drawTogether"));
  await page.getByLabel(t("together.setup.namesLabel")).fill("Simon\nFatima\nNoor");
  await page.getByRole("button", { name: t("together.setup.start") }).click();

  const seen: string[] = [];
  for (const name of ["Simon", "Fatima", "Noor"]) {
    await expect(page.getByRole("heading", { name: t("together.handoff.title", { name }) })).toBeVisible();
    await expect(page.locator(".together-recipient")).toHaveCount(0);
    const ready = page.getByRole("button", { name: t("together.handoff.ready", { name }) });
    await expect(ready).toBeEnabled();
    await ready.click();
    const yes = page.getByRole("button", { name: t("together.confirm.yes", { name }) });
    await expect(yes).toBeEnabled();
    await yes.click();
    const recipient = (await page.locator(".together-recipient").innerText()).trim();
    expect(recipient).not.toBe(name);
    seen.push(recipient);
    const hide = page.getByRole("button", { name: t("together.reveal.hide") });
    await expect(hide).toBeEnabled();
    await hide.click();
  }
  expect(new Set(seen).size).toBe(3);
  await expect(page.getByRole("heading", { name: t("together.done.title") })).toBeVisible();
  await expect(page.locator(".together-recipient")).toHaveCount(0);
  expect(requests).toEqual([]);
});

test("the setup explains what is wrong with the names", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.goto(pagePath(testInfo, "drawTogether"));
  await page.getByLabel(t("together.setup.namesLabel")).fill("Simon\nFatima");
  await page.getByRole("button", { name: t("together.setup.start") }).click();
  await expect(page.locator("#together-names-error")).toContainText(t("together.error.too_few", { min: 3 }));
});

test("partners can be excluded and an impossible set is explained", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  await page.goto(pagePath(testInfo, "drawTogether"));
  const names = page.getByLabel(t("together.setup.namesLabel"));
  const addPair = async (a: string, b: string) => {
    await page.getByLabel(t("together.exclusions.first")).selectOption(a);
    await page.getByLabel(t("together.exclusions.second")).selectOption(b);
    await page.getByRole("button", { name: t("together.exclusions.add") }).click();
  };

  // Three people with one excluded pair has no valid draw.
  await names.fill("Simon\nFatima\nNoor");
  await addPair("Simon", "Fatima");
  await expect(page.getByText(t("together.exclusions.pair", { a: "Simon", b: "Fatima" }))).toBeVisible();
  await page.getByRole("button", { name: t("together.setup.start") }).click();
  await expect(page.locator("#together-names-error")).toContainText(t("together.error.impossible"));

  // Two couples among four people: everyone draws from the other couple.
  await names.fill("Simon\nFatima\nNoor\nLudo");
  await addPair("Noor", "Ludo");
  await page.getByRole("button", { name: t("together.setup.start") }).click();
  const couples: Record<string, string[]> = { Simon: ["Noor", "Ludo"], Fatima: ["Noor", "Ludo"], Noor: ["Simon", "Fatima"], Ludo: ["Simon", "Fatima"] };
  for (const name of ["Simon", "Fatima", "Noor", "Ludo"]) {
    const ready = page.getByRole("button", { name: t("together.handoff.ready", { name }) });
    await expect(ready).toBeEnabled();
    await ready.click();
    const yes = page.getByRole("button", { name: t("together.confirm.yes", { name }) });
    await expect(yes).toBeEnabled();
    await yes.click();
    expect(couples[name]).toContain((await page.locator(".together-recipient").innerText()).trim());
    const hide = page.getByRole("button", { name: t("together.reveal.hide") });
    await expect(hide).toBeEnabled();
    await hide.click();
  }
  await expect(page.getByRole("heading", { name: t("together.done.title") })).toBeVisible();
});
