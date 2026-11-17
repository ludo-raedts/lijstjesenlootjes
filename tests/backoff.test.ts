import assert from "node:assert/strict";
import test from "node:test";
import { commitBackoffMs } from "../src/lib/backoff";

test("the commit backoff grows with each attempt and never exceeds its ceiling", () => {
  const worst = (attempt: number) => commitBackoffMs(attempt, () => 0.999999);
  assert.ok(worst(0) < 20);
  assert.ok(worst(1) < 40);
  assert.ok(worst(2) < 80);
  assert.ok(worst(10) < 400);
  assert.equal(commitBackoffMs(5, () => 0), 0);
});

test("the commit backoff is jittered, so colliding writers do not retry in lockstep", () => {
  const samples = new Set(Array.from({ length: 50 }, () => commitBackoffMs(4)));
  assert.ok(samples.size > 5);
});
