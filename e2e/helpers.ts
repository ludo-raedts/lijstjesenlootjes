import { expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createTranslator, type MessageKey } from "../src/i18n/messages";
import type { Locale } from "../src/i18n/config";
import { pathForLocale, type PageKey } from "../src/lib/paths";
import { MOCK_URL } from "../playwright.config";

export function localeOf(testInfo: TestInfo): Locale {
  return testInfo.project.name === "en" ? "en" : "nl";
}

export function i18n(testInfo: TestInfo) {
  const locale = localeOf(testInfo);
  return { locale, t: createTranslator(locale) };
}

export function pagePath(testInfo: TestInfo, key: PageKey) {
  return pathForLocale(key, localeOf(testInfo));
}

/** Clears the in-memory database and rate limits so every spec starts from nothing. */
export async function resetBackend() {
  const response = await fetch(`${MOCK_URL}/__reset`, { method: "POST" });
  if (!response.ok) throw new Error("The mock database could not be reset.");
}

export async function mockState() {
  const response = await fetch(`${MOCK_URL}/__state`);
  return (await response.json()) as {
    data: { wishlists: unknown[]; draws: unknown[]; accessTokens: unknown[]; sessions: unknown[]; siteSettings?: unknown };
  };
}

export function label(t: (key: MessageKey) => string, key: MessageKey) {
  return t(key).replace(/\s*\*\s*$/, "");
}

/** Fails on any serious or critical WCAG A/AA violation and prints the offending nodes. */
export async function expectNoAxeViolations(page: Page, context?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  const summary = serious.map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`);
  expect(serious, `${context ?? "page"} has accessibility violations:\n${summary.join("\n")}`).toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page scrolls horizontally").toBeLessThanOrEqual(1);
}

export type TestWishlist = { manageUrl: string; guestUrl: string };
export type TestDraw = {
  adminUrl: string;
  participantLinks: Array<{ participantId: string; name: string; url: string }>;
};

/** Calls the API from inside the browser, so the request carries the page's real host and Origin. */
export async function browserFetch(page: Page, path: string, init?: { method?: string; body?: unknown }) {
  if (page.url() === "about:blank") await page.goto("/");
  return page.evaluate(async ({ path: target, init: options }) => {
    const response = await fetch(target, {
      method: options?.method ?? "GET",
      headers: { "content-type": "application/json" },
      body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    });
    return { status: response.status, headers: Object.fromEntries(response.headers.entries()), text: await response.text() };
  }, { path, init });
}

export async function createWishlistViaApi(page: Page, wishes = ["Thermos flask", "Wool socks"]) {
  const response = await browserFetch(page, "/api/wishlists", {
    method: "POST",
    body: { title: "Synthetic list", wishes: wishes.map((title) => ({ title })) },
  });
  expect(response.status).toBe(201);
  return JSON.parse(response.text) as TestWishlist;
}

export async function createDrawViaApi(page: Page) {
  const names = ["Alex", "Sam", "Kim", "Noor"];
  const response = await browserFetch(page, "/api/draws", {
    method: "POST",
    body: {
      requestId: crypto.randomUUID(),
      organizerName: "Alex",
      participants: names.map((name, index) => ({ id: `p${index}`, name })),
      exclusions: [],
    },
  });
  expect(response.status).toBe(201);
  return JSON.parse(response.text) as TestDraw;
}

/**
 * Links in API responses and on screen are built from the server's own bind address under `next start`
 * (on Vercel they carry the real host). Re-point them at the origin the browser actually uses.
 */
export function rebase(link: string, baseURL: string | undefined) {
  if (!baseURL) throw new Error("A baseURL is required.");
  const url = new URL(link);
  return `${new URL(baseURL).origin}${url.pathname}${url.search}${url.hash}`;
}
