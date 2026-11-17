import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import test from "node:test";
import { SITE_DOMAINS } from "../src/lib/domains";
import {
  PAGES,
  alternatesFor,
  internalPath,
  linkHeaderValue,
  pathForHost,
  pathForLocale,
  privatePathPrefixes,
  redirectRules,
  rewriteRules,
} from "../src/lib/paths";
import { personalLink } from "../src/lib/personal-links";

test("every page has a distinct path per language and unique paths overall", () => {
  for (const locale of ["nl", "en"] as const) {
    const paths = PAGES.map((page) => page.paths[locale]);
    assert.equal(new Set(paths).size, paths.length, `duplicate ${locale} paths`);
  }
});

test("internal routes exist as app folders", () => {
  for (const page of PAGES) {
    const folder = internalPath(page.key) === "/" ? "src/app/page.tsx" : `src/app${internalPath(page.key)}/page.tsx`;
    assert.ok(existsSync(folder), `${folder} should exist`);
  }
});

test("the path follows the domain; unknown hosts use Dutch paths", () => {
  assert.equal(pathForHost("wishlistCreate", "wishanddraw.com"), "/create-wishlist");
  assert.equal(pathForHost("wishlistCreate", "www.wishanddraw.com:443"), "/create-wishlist");
  assert.equal(pathForHost("wishlistCreate", "lijstjesenlootjes.nl"), "/verlanglijstje-maken");
  assert.equal(pathForHost("drawReveal", "lijstje-en-lootjes.vercel.app"), "/lootje");
  assert.equal(pathForHost("drawReveal", null), "/lootje");
  assert.equal(pathForLocale("help", "en"), "/help");
});

test("hreflang pairs point nl <-> en with the right slug and x-default to the .nl page", () => {
  const alternates = alternatesFor("wishlistCreate");
  assert.deepEqual(alternates, [
    { hreflang: "nl", url: "https://lijstjesenlootjes.nl/verlanglijstje-maken" },
    { hreflang: "en", url: "https://wishanddraw.com/create-wishlist" },
    { hreflang: "x-default", url: "https://lijstjesenlootjes.nl/verlanglijstje-maken" },
  ]);
  assert.equal(alternatesFor("home")[1].url, "https://wishanddraw.com");
  assert.equal(alternatesFor("help")[1].url, "https://wishanddraw.com/help");
  assert.match(linkHeaderValue("drawCreate"), /<https:\/\/wishanddraw\.com\/draw-names>; rel="alternate"; hreflang="en"/);
  assert.equal(SITE_DOMAINS[0].locale, "nl");
});

test("redirects: each domain sends other languages' paths to its canonical path", () => {
  const rules = redirectRules();
  const find = (host: string, source: string) => rules.find((rule) => rule.host === host && rule.source === source);
  assert.equal(find("wishanddraw.com", "/verlanglijstje-maken")?.destination, "/create-wishlist");
  assert.equal(find("wishanddraw.com", "/lootje")?.destination, "/draw/reveal");
  assert.equal(find("lijstjesenlootjes.nl", "/create-wishlist")?.destination, "/verlanglijstje-maken");
  assert.equal(find("lijstjesenlootjes.nl", "/draw/manage")?.destination, "/trekking-beheren");
  // no redirects for shared paths, none from a canonical path, and no loops
  assert.equal(find("wishanddraw.com", "/help"), undefined);
  assert.equal(find("wishanddraw.com", "/create-wishlist"), undefined);
  assert.equal(find("lijstjesenlootjes.nl", "/verlanglijstje-maken"), undefined);
  for (const rule of rules) assert.notEqual(rule.source, rule.destination);
});

test("rewrites: only the English domain rewrites, to the internal Dutch route", () => {
  const rules = rewriteRules();
  assert.ok(rules.every((rule) => rule.host === "wishanddraw.com"));
  assert.deepEqual(
    rules.find((rule) => rule.source === "/wishlist/manage"),
    { host: "wishanddraw.com", source: "/wishlist/manage", destination: "/verlanglijstje/beheren" },
  );
  assert.ok(!rules.some((rule) => rule.source === "/help"));
  for (const rule of rules) assert.ok(PAGES.some((page) => internalPath(page.key) === rule.destination));
});

test("proxy matcher and robots cover private paths in both languages", () => {
  const source = readFileSync("src/proxy.ts", "utf8");
  for (const prefix of privatePathPrefixes()) {
    assert.ok(source.includes(`"${prefix}/:path*"`), `proxy matcher should cover ${prefix}`);
  }
  assert.ok(privatePathPrefixes().includes("/wishlist/manage"));
  assert.ok(privatePathPrefixes().includes("/lootje"));
  assert.ok(!privatePathPrefixes().includes("/help"));
});

test("personal links use the domain's path and keep the token in the fragment", () => {
  const en = new Request("https://wishanddraw.com/api/wishlists", { headers: { host: "wishanddraw.com" } });
  assert.equal(personalLink(en, "wishlistGuest", "abc"), "https://wishanddraw.com/wishlist/view#token=abc");
  const nl = new Request("https://lijstjesenlootjes.nl/api/draws", { headers: { "x-forwarded-host": "lijstjesenlootjes.nl" } });
  assert.equal(personalLink(nl, "drawReveal", "abc"), "https://lijstjesenlootjes.nl/lootje#token=abc");
});

test("no hard-coded Dutch paths remain outside the path map", () => {
  const dutchPaths = PAGES.map((page) => page.paths.nl).filter((path) => path !== "/" && path !== "/help" && path !== "/privacy");
  const allowed = new Set(["src/lib/paths.ts", "src/proxy.ts"]);
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
    );
  for (const file of walk("src").filter((name) => /\.(ts|tsx)$/.test(name) && !allowed.has(name) && !name.startsWith("src/i18n/"))) {
    const text = readFileSync(file, "utf8");
    for (const path of dutchPaths) assert.ok(!text.includes(`"${path}`) && !text.includes(`}${path}`), `${file} hard-codes ${path}`);
  }
});
