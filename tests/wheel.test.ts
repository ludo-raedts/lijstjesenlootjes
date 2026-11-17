import assert from "node:assert/strict";
import test from "node:test";
import { secureIndex } from "../src/lib/wheel";

test("secureIndex rejects invalid counts", () => {
  assert.throws(() => secureIndex(0));
  assert.throws(() => secureIndex(2.5));
});

test("secureIndex uses rejection sampling without modulo bias", () => {
  const values = [0xffffffff, 8];
  let calls = 0;
  const result = secureIndex(3, (target) => {
    target[0] = values[calls++];
    return target;
  });
  assert.equal(calls, 2);
  assert.equal(result, 2);
});
