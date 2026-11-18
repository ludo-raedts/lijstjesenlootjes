import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AmazonAffiliateProvider } from "../src/components/AmazonAffiliate";
import { WishIdeas } from "../src/components/WishIdeas";
import { I18nProvider } from "../src/i18n/I18nProvider";

function renderIdeas(locale: "nl" | "en", bol: { siteId: string } | null) {
  return renderToStaticMarkup(createElement(I18nProvider, {
    locale,
    children: createElement(AmazonAffiliateProvider, {
      config: null,
      bol,
      children: createElement(WishIdeas, { existingTitles: [], full: false, onAdd: () => {} }),
    }),
  }));
}

test("shop-specific suggestions respect the active affiliate configuration", () => {
  const enabled = renderIdeas("nl", { siteId: "1560649" });
  const disabled = renderIdeas("nl", null);
  assert.match(enabled, /Peter Pauper Bookbound/);
  assert.match(enabled, /Product bij bol/);
  assert.doesNotMatch(disabled, /Peter Pauper Bookbound/);
  assert.doesNotMatch(disabled, /Product bij bol/);
  assert.match(disabled, /Mooi notitieboek/);
});

test("English visitors see English ideas without Dutch shop products", () => {
  const english = renderIdeas("en", null);
  assert.match(english, /Discover gift ideas/);
  assert.match(english, /A lovely notebook/);
  assert.doesNotMatch(english, /Peter Pauper Bookbound/);
  assert.doesNotMatch(english, /€ 15/);
});
