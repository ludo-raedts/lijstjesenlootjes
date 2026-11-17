import assert from "node:assert/strict";
import test from "node:test";
import { buildBolSearchUrl, resolveBolLink, wrapBolUrl } from "../src/lib/affiliate/bol";

const config = { siteId: "1560649" };

test("lijstjesenlootjes.nl resolves to the bol programme for Dutch only", () => {
  assert.deepEqual(resolveBolLink("lijstjesenlootjes.nl", "nl"), config);
  assert.equal(resolveBolLink("lijstjesenlootjes.nl", "en"), null);
  assert.equal(resolveBolLink("wishanddraw.com", "en"), null);
  assert.equal(resolveBolLink(null, "nl"), null);
});

test("the kill switch disables bol links and a bad site id is rejected", () => {
  assert.equal(resolveBolLink("lijstjesenlootjes.nl", "nl", { BOL_AFFILIATE_DISABLED: "1" }), null);
  assert.ok(resolveBolLink("lijstjesenlootjes.nl", "nl", { BOL_AFFILIATE_DISABLED: "0" }));
  assert.equal(resolveBolLink("lijstjesenlootjes.nl", "nl", { BOL_AFFILIATE_SITE_ID: "12&x=1" }), null);
  assert.equal(resolveBolLink("lijstjesenlootjes.nl", "nl", { BOL_AFFILIATE_SITE_ID: "99999" })?.siteId, "99999");
});

test("search links go through the partner click endpoint and carry only the query", () => {
  const url = new URL(buildBolSearchUrl("Lego Set & “Friends” 🎁", config)!);
  assert.equal(url.origin + url.pathname, "https://partner.bol.com/click/click");
  assert.equal(url.searchParams.get("s"), "1560649");
  const target = new URL(url.searchParams.get("url")!);
  assert.equal(target.origin + target.pathname, "https://www.bol.com/nl/nl/s/");
  assert.equal(target.searchParams.get("searchtext"), "Lego Set & “Friends” 🎁");
});

test("search links reject empty queries and cap long ones", () => {
  assert.equal(buildBolSearchUrl("   ", config), null);
  const url = new URL(buildBolSearchUrl("a".repeat(500), config)!);
  assert.equal(new URL(url.searchParams.get("url")!).searchParams.get("searchtext")!.length, 120);
});

test("only bol.com links are wrapped", () => {
  const wrapped = wrapBolUrl("http://www.bol.com/nl/nl/p/foo/123/?x=1", config)!;
  assert.equal(new URL(new URL(wrapped).searchParams.get("url")!).href, "https://www.bol.com/nl/nl/p/foo/123/?x=1");
  assert.equal(wrapBolUrl("https://www.coolblue.nl/x", config), null);
  assert.equal(wrapBolUrl("https://bol.com.evil.example/x", config), null);
  assert.equal(wrapBolUrl("https://partner.bol.com/click/click?s=1", config), null);
  assert.equal(wrapBolUrl("javascript:alert(1)", config), null);
  assert.equal(wrapBolUrl("not a url", config), null);
});
