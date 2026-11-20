import assert from "node:assert/strict";
import test from "node:test";
import { drawAssignments, parsePassDrawNames } from "../src/lib/pass-draw";

test("every participant draws exactly one other person, for many group sizes", () => {
  for (let count = 3; count <= 30; count += 1) {
    for (let round = 0; round < 50; round += 1) {
      const result = drawAssignments(count)!;
      assert.equal(new Set(result).size, count, "everyone is drawn exactly once");
      result.forEach((recipient, giver) => assert.notEqual(recipient, giver));
    }
  }
});

test("a degenerate random source still yields a valid draw", () => {
  // A random source that always returns 0 makes every plain shuffle the same permutation.
  const result = drawAssignments(6, { random: () => 0 })!;
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

test("excluded pairs never draw each other, in either direction", () => {
  const exclusions = [[0, 1], [2, 3]] as const;
  for (let round = 0; round < 300; round += 1) {
    const result = drawAssignments(6, { exclusions })!;
    assert.equal(new Set(result).size, 6);
    result.forEach((recipient, giver) => assert.notEqual(recipient, giver));
    assert.notEqual(result[0], 1);
    assert.notEqual(result[1], 0);
    assert.notEqual(result[2], 3);
    assert.notEqual(result[3], 2);
  }
});

test("a tightly constrained but solvable draw is found; an impossible one returns null", () => {
  // Two couples among four people: each person must draw from the other couple.
  for (let round = 0; round < 100; round += 1) {
    const result = drawAssignments(4, { exclusions: [[0, 1], [2, 3]] })!;
    assert.ok(result[0] >= 2 && result[1] >= 2 && result[2] <= 1 && result[3] <= 1);
  }
  // Three people with one excluded pair: both of them can only draw the third person.
  assert.equal(drawAssignments(3, { exclusions: [[0, 1]] }), null);
});
