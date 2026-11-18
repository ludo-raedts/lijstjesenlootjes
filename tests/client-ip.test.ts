import assert from "node:assert/strict";
import test from "node:test";
import { clientIdentifier } from "../src/lib/client-ip";

const headers = (values: Record<string, string>) => new Headers(values);

test("the platform header wins over anything the caller can set", () => {
  assert.equal(clientIdentifier(headers({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "203.0.113.9");
});

test("x-real-ip is used when there is no platform header", () => {
  assert.equal(clientIdentifier(headers({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "1.1.1.1" })), "198.51.100.4");
});

test("a spoofed leftmost forwarded-for entry is ignored: the rightmost one is used", () => {
  assert.equal(clientIdentifier(headers({ "x-forwarded-for": "6.6.6.6, 192.0.2.7" })), "192.0.2.7");
});

test("without any header requests share one local bucket", () => {
  assert.equal(clientIdentifier(headers({})), "local");
});
