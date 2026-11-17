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

test("a locale without written ideas shows no ideas block", () => {
  assert.deepEqual(ideasForLocale("en"), []);
});
