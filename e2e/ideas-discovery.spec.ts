import { expect, test } from "@playwright/test";

test("visitors can pick a category and add a general idea without a product link", async ({ page }, testInfo) => {
  const dutch = testInfo.project.name === "nl";
  await page.goto(dutch ? "/verlanglijstje-maken" : "/wishlist-maker");
  await page.getByRole("button", { name: dutch ? "Kleine cadeaus" : "Little gifts" }).click();
  const title = dutch ? "Mooi notitieboek" : "A lovely notebook";
  await page.getByRole("button", { name: dutch ? `${title} toevoegen aan mijn lijstje` : `Add ${title} to my list` }).click();
  await expect(page.locator("#wish-title-0")).toHaveValue(title);
  await expect(page.locator("#wish-url-0")).toHaveValue("");
});

test("a Dutch visitor can explicitly choose a specific product", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "nl", "The curated bol products are available only in Dutch.");
  await page.goto("/verlanglijstje-maken");
  await page.getByRole("button", { name: "Kleine cadeaus" }).click();
  const name = "Peter Pauper Bookbound notitieboek – Gilded Tree of Life";
  await page.getByRole("button", { name: `${name} toevoegen aan mijn lijstje` }).click();
  await expect(page.locator("#wish-title-0")).toHaveValue(name);
  await expect(page.locator("#wish-url-0")).toHaveValue("https://www.bol.com/nl/nl/p/product/9300000045174131/");
});

test("an added idea shows its confirmation in the card and can be undone", async ({ page }, testInfo) => {
  const dutch = testInfo.project.name === "nl";
  await page.goto(dutch ? "/verlanglijstje-maken" : "/wishlist-maker");
  await page.getByRole("button", { name: dutch ? "Kleine cadeaus" : "Little gifts" }).click();
  const title = dutch ? "Mooi notitieboek" : "A lovely notebook";
  await page.getByRole("button", { name: dutch ? `${title} toevoegen aan mijn lijstje, zonder vast product` : `Add ${title} to my list` }).or(
    page.getByRole("button", { name: dutch ? `${title} toevoegen aan mijn lijstje` : `Add ${title} to my list` }),
  ).first().click();
  await expect(page.locator("#wish-title-0")).toHaveValue(title);
  await page.getByRole("button", { name: dutch ? `Toevoeging van ${title} ongedaan maken` : `Undo adding ${title}` }).click();
  await expect(page.locator("#wish-title-0")).toHaveValue("");
});
