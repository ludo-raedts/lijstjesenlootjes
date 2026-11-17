import assert from "node:assert/strict";
import test from "node:test";
import { buildAmazonSearchUrl, resolveAmazonLink } from "../src/lib/affiliate/amazon";

test("wishanddraw.com resolves to the amazon.com programme for English only", () => {
  assert.deepEqual(resolveAmazonLink("wishanddraw.com", "en"), { marketplaceHost: "www.amazon.com", tag: "wishanddraw-20" });
  assert.equal(resolveAmazonLink("wishanddraw.com", "nl"), null);
});

test("domains without a registered programme get no affiliate links", () => {
  assert.equal(resolveAmazonLink("lijstjesenlootjes.nl", "nl"), null);
  assert.equal(resolveAmazonLink("lijstjesenlootjes.nl", "en"), null);
  assert.equal(resolveAmazonLink(null, "en"), null);
});

test("the kill switch disables all Amazon links", () => {
  assert.equal(resolveAmazonLink("wishanddraw.com", "en", { AMAZON_AFFILIATE_DISABLED: "1" }), null);
  assert.ok(resolveAmazonLink("wishanddraw.com", "en", { AMAZON_AFFILIATE_DISABLED: "0" }));
});

test("the tag can be overridden but must look like an Associates tag", () => {
  assert.equal(resolveAmazonLink("wishanddraw.com", "en", { AMAZON_ASSOCIATE_TAG_US: "other-20" })?.tag, "other-20");
  assert.equal(resolveAmazonLink("wishanddraw.com", "en", { AMAZON_ASSOCIATE_TAG_US: "bad tag&x=1" }), null);
});

test("search links carry the tag and encode the query", () => {
  const config = { marketplaceHost: "www.amazon.com", tag: "wishanddraw-20" };
  const url = new URL(buildAmazonSearchUrl("Lego Set & “Friends” 🎁", config)!);
  assert.equal(url.origin, "https://www.amazon.com");
  assert.equal(url.pathname, "/s");
  assert.equal(url.searchParams.get("tag"), "wishanddraw-20");
  assert.equal(url.searchParams.get("k"), "Lego Set & “Friends” 🎁");
});

test("search links reject empty queries and cap long ones", () => {
  const config = { marketplaceHost: "www.amazon.com", tag: "wishanddraw-20" };
  assert.equal(buildAmazonSearchUrl("   ", config), null);
  const long = new URL(buildAmazonSearchUrl("a".repeat(500), config)!);
  assert.equal(long.searchParams.get("k")!.length, 120);
});
