import { expect, test } from "@playwright/test";
import { i18n, pagePath } from "./helpers";

test("pass the device: each person sees only their own draw, once", async ({ page }, testInfo) => {
  const { t } = i18n(testInfo);
  const requests: string[] = [];
  page.on("request", (request) => { if (request.method() !== "GET" && !request.url().endsWith("/api/traffic")) requests.push(request.url()); });
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
