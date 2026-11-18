import { expect, test } from "@playwright/test";

test("visitors can search and add a general idea without a product link", async ({ page }, testInfo) => {
  const dutch = testInfo.project.name === "nl";
  await page.goto(dutch ? "/verlanglijstje-maken" : "/wishlist-maker");
  await page.getByLabel(dutch ? "Zoek in cadeau-ideeën" : "Search gift ideas").fill(dutch ? "notitieboek" : "notebook");
  const title = dutch ? "Mooi notitieboek" : "A lovely notebook";
  await page.getByRole("button", { name: dutch ? `+ Voeg idee toe: ${title}` : `+ Add idea: ${title}` }).click();
  await expect(page.locator("#wish-title-0")).toHaveValue(title);
  await expect(page.locator("#wish-url-0")).toHaveValue("");
});

test("a Dutch visitor can explicitly choose a specific product", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "nl", "The curated bol products are available only in Dutch.");
  await page.goto("/verlanglijstje-maken");
  await page.getByLabel("Zoek in cadeau-ideeën").fill("notitieboek");
  const name = "Peter Pauper Bookbound notitieboek – Gilded Tree of Life";
  await page.getByRole("button", { name: `+ Voeg dit product toe: ${name}` }).click();
  await expect(page.locator("#wish-title-0")).toHaveValue(name);
  await expect(page.locator("#wish-url-0")).toHaveValue("https://www.bol.com/nl/nl/p/product/9300000045174131/");
});
