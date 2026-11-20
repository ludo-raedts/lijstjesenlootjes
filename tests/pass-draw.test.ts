import assert from "node:assert/strict";
import test from "node:test";
import { drawAssignments, parsePassDrawNames } from "../src/lib/pass-draw";

test("every participant draws exactly one other person, for many group sizes", () => {
  for (let count = 3; count <= 30; count += 1) {
    for (let round = 0; round < 50; round += 1) {
      const result = drawAssignments(count);
      assert.equal(new Set(result).size, count, "everyone is drawn exactly once");
      result.forEach((recipient, giver) => assert.notEqual(recipient, giver));
    }
  }
});

test("the single-cycle fallback is valid when plain shuffles never succeed", () => {
  // A random source that always returns 0 makes every plain shuffle a rotation-free permutation check fail path.
  const result = drawAssignments(6, () => 0);
  assert.equal(new Set(result).size, 6);
  result.forEach((recipient, giver) => assert.notEqual(recipient, giver));
});

test("names are trimmed, blank lines dropped and the group validated", () => {
  assert.deepEqual(parsePassDrawNames(" Simon \n\nFatima\r\n  Noor  "), { ok: true, names: ["Simon", "Fatima", "Noor"] });
  assert.deepEqual(parsePassDrawNames("A\nB"), { ok: false, error: "too_few", params: { min: 3 } });
  assert.equal(parsePassDrawNames("Noor\nnoor\nLudo").ok, false);
  assert.equal(parsePassDrawNames(Array.from({ length: 31 }, (_, i) => `P${i}`).join("\n")).ok, false);
  assert.equal(parsePassDrawNames(`${"x".repeat(41)}\nB\nC`).ok, false);
});
