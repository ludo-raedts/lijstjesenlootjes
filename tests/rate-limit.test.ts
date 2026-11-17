import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimitBucketKey } from "../src/lib/rate-limit";

test("rate-limit bucket keys are stable and do not expose the identifier", () => {
  const key = createRateLimitBucketKey("203.0.113.24", "wishlist-create", "test-secret");

  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(
    key,
    createRateLimitBucketKey("203.0.113.24", "wishlist-create", "test-secret"),
  );
  assert.equal(key.includes("203.0.113.24"), false);
});

test("rate-limit buckets are isolated by action and identifier", () => {
  const base = createRateLimitBucketKey("203.0.113.24", "wishlist-create", "test-secret");

  assert.notEqual(
    base,
    createRateLimitBucketKey("203.0.113.24", "draw-create", "test-secret"),
  );
  assert.notEqual(
    base,
    createRateLimitBucketKey("203.0.113.25", "wishlist-create", "test-secret"),
  );
});
