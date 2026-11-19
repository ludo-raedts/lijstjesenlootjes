import assert from "node:assert/strict";
import test from "node:test";
import { translateApiError } from "../src/i18n/api-errors";
import { apiErrorCodes } from "../src/lib/api-error";

test("every API error code has Dutch and English copy", () => {
  for (const code of apiErrorCodes) {
    assert.ok(translateApiError(code, { field: "title", min: 1, max: 50 }, "nl").length > 0);
    assert.ok(translateApiError(code, { field: "title", min: 1, max: 50 }, "en").length > 0);
  }
});

test("field validation is localized in the browser", () => {
  assert.equal(
    translateApiError("field_required", { field: "groupName" }, "nl"),
    "Groepsnaam ontbreekt.",
  );
  assert.equal(
    translateApiError("field_required", { field: "groupName" }, "en"),
    "Group name is required.",
  );
});

test("the visitor's domain selects the default locale", async () => {
  const { localeForHost, originForHost } = await import("../src/lib/domains");
  assert.equal(localeForHost("lijstjesenlootjes.nl"), "nl");
  assert.equal(localeForHost("wishanddraw.com"), "en");
  assert.equal(localeForHost("WWW.WishAndDraw.com:443"), "en");
  assert.equal(localeForHost("lijstjes-en-lootjes.vercel.app"), null);
  assert.equal(localeForHost(null), null);
  assert.equal(originForHost("www.wishanddraw.com"), "https://wishanddraw.com");
  assert.equal(originForHost("localhost:3000"), null);
});

test("Dutch and English catalogs have identical keys and placeholders", async () => {
  const { nlMessages } = await import("../src/i18n/messages/nl");
  const { enMessages } = await import("../src/i18n/messages/en");
  assert.deepEqual(Object.keys(enMessages).sort(), Object.keys(nlMessages).sort());
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const key of Object.keys(nlMessages) as Array<keyof typeof nlMessages>) {
    assert.deepEqual(placeholders(enMessages[key]), placeholders(nlMessages[key]), key);
  }
});

test("German only uses real keys, keeps every placeholder and falls back to English for the rest", async () => {
  const { deMessages } = await import("../src/i18n/messages/de");
  const { enMessages } = await import("../src/i18n/messages/en");
  const { translate } = await import("../src/i18n/messages");
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [key, value] of Object.entries(deMessages)) {
    assert.ok(key in enMessages, `${key} is not a known message key`);
    assert.deepEqual(placeholders(value as string), placeholders(enMessages[key as keyof typeof enMessages]), key);
  }
  // The interface a visitor touches must be translated; pages without German copy fall back to English.
  assert.equal(translate("de", "nav.draw"), "Wichteln");
  assert.equal(translate("de", "admin.page.title"), enMessages["admin.page.title"]);
  assert.ok(Object.keys(deMessages).length > Object.keys(enMessages).length * 0.55);
});

test("German formats dates and API errors in German", async () => {
  const { formattingLocales } = await import("../src/i18n/config");
  assert.equal(formattingLocales.de, "de-DE");
  assert.match(translateApiError("rate_limited", {}, "de"), /Minute/);
  assert.equal(translateApiError("field_required", { field: "groupName" }, "de"), "Gruppenname fehlt.");
});

test("German covers every key except the owner-only admin and usage screens, with intact placeholders", async () => {
  const { enMessages } = await import("../src/i18n/messages/en");
  const { deMessages } = await import("../src/i18n/messages/de");
  const ownerOnly = /^(admin|usage|meta\.admin|meta\.usage)/;
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  const german = deMessages as Record<string, string | undefined>;
  const missing = Object.keys(enMessages).filter((key) => !ownerOnly.test(key) && !german[key]);
  assert.deepEqual(missing, [], "German keys missing; add them or they fall back to English");
  for (const [key, value] of Object.entries(enMessages)) {
    const text = german[key];
    if (text) assert.deepEqual(placeholders(text), placeholders(value), key);
  }
});

