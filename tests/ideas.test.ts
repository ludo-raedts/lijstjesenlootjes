import assert from "node:assert/strict";
import test from "node:test";
import { IDEA_CATEGORIES, IDEA_IDS, ideasForLocale } from "../src/i18n/ideas";

test("every Dutch category has ten ideas with unique ids and titles", () => {
  const groups = ideasForLocale("nl");
  assert.deepEqual(groups.map((group) => group.category), [...IDEA_CATEGORIES]);
  const titles = new Set<string>();
  for (const group of groups) {
    assert.equal(group.ideas.length, 10, group.category);
    assert.equal(group.ideas.length, IDEA_IDS[group.category].length);
    for (const idea of group.ideas) {
      assert.ok(idea.title.length > 0 && idea.title.length <= 160);
      titles.add(idea.title.toLowerCase());
    }
  }
  assert.equal(titles.size, groups.length * 10);
});

test("English ideas are available without Dutch shop products or euro price claims", () => {
  const groups = ideasForLocale("en");
  assert.deepEqual(groups.map((group) => group.category), [...IDEA_CATEGORIES]);
  assert.equal(groups.flatMap((group) => group.ideas).length, 60);
  assert.ok(groups.every((group) => group.ideas.every((idea) => !idea.product)));
});

test("curated products are unique, well-formed bol links", () => {
  const groups = ideasForLocale("nl");
  const withProduct = groups.flatMap((group) => group.ideas.filter((idea) => idea.product));
  assert.ok(withProduct.length >= 40);
  const urls = new Set<string>();
  for (const idea of withProduct) {
    assert.match(idea.product!.url, /^https:\/\/www\.bol\.com\/nl\/nl\/p\/product\/\d{13,16}\/$/);
    assert.ok(idea.product!.name.length > 0 && idea.product!.name.length <= 100);
    urls.add(idea.product!.url);
  }
  assert.equal(urls.size, withProduct.length, "no product is used twice");
  // The English locale never gets bol products.
  assert.ok(ideasForLocale("en").flatMap((group) => group.ideas).every((idea) => !idea.product));
});
