import assert from "node:assert/strict";
import test from "node:test";
import { buildAmazonSearchUrl, resolveAmazonLink, tagAmazonUrl } from "../src/lib/affiliate/amazon";

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

const amazon = { marketplaceHost: "www.amazon.com", tag: "wishanddraw-20" };

test("amazon.com product links receive our tag and keep their other parameters", () => {
  const tagged = new URL(tagAmazonUrl("https://www.amazon.com/dp/B0ABC12345?th=1", amazon)!);
  assert.equal(tagged.pathname, "/dp/B0ABC12345");
  assert.equal(tagged.searchParams.get("th"), "1");
  assert.equal(tagged.searchParams.get("tag"), "wishanddraw-20");
  assert.equal(new URL(tagAmazonUrl("http://amazon.com/dp/B0ABC12345", amazon)!).protocol, "https:");
});

test("a tag someone else put in a link is replaced, not duplicated", () => {
  const url = new URL(tagAmazonUrl("https://www.amazon.com/dp/B0ABC12345?tag=someone-20&tag=x-20", amazon)!);
  assert.deepEqual(url.searchParams.getAll("tag"), ["wishanddraw-20"]);
});

test("other hosts, short links, other marketplaces and bad input are left alone", () => {
  for (const link of [
    "https://www.amazon.nl/dp/B0ABC12345",
    "https://amzn.to/3abc",
    "https://a.co/d/abc",
    "https://amazon.com.evil.test/dp/B0",
    "https://evil.test/?u=amazon.com",
    "javascript:alert(1)",
    "not a url",
  ]) assert.equal(tagAmazonUrl(link, amazon), null, link);
});
