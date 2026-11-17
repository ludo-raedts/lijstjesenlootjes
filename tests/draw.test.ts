import assert from "node:assert/strict";
import test from "node:test";
import { createAssignments, hasPerfectMatching } from "../src/lib/draw";

const people = [
  { id: "a", name: "Sam" },
  { id: "b", name: "Sam" },
  { id: "c", name: "Noor" },
  { id: "d", name: "Lina" },
];

test("duplicate names remain separate participants", () => {
  const result = createAssignments(people, []);
  assert.equal(result.kind, "success");
  if (result.kind !== "success") return;
  assert.equal(new Set(result.assignments.map(({ giverId }) => giverId)).size, people.length);
  assert.equal(new Set(result.assignments.map(({ recipientId }) => recipientId)).size, people.length);
  assert.ok(result.assignments.every(({ giverId, recipientId }) => giverId !== recipientId));
});

test("mutual exclusions are respected", () => {
  const exclusions = [{ from: "a", to: "b" }, { from: "b", to: "a" }];
  const result = createAssignments(people, exclusions);
  assert.equal(result.kind, "success");
  if (result.kind !== "success") return;
  assert.ok(!result.assignments.some(({ giverId, recipientId }) =>
    (giverId === "a" && recipientId === "b") || (giverId === "b" && recipientId === "a"),
  ));
});

test("a provably impossible draw is identified", () => {
  const trio = people.slice(0, 3);
  const exclusions = [
    { from: "a", to: "b" }, { from: "a", to: "c" },
  ];
  assert.equal(hasPerfectMatching(trio, exclusions), false);
  assert.deepEqual(createAssignments(trio, exclusions), { kind: "impossible" });
});

test("the attempt limit is reported as a technical limit", () => {
  const trio = people.slice(0, 3);
  const exclusions = [
    { from: "a", to: "b" },
    { from: "b", to: "c" },
    { from: "c", to: "a" },
  ];
  assert.equal(hasPerfectMatching(trio, exclusions), true);
  const result = createAssignments(trio, exclusions, { attempts: 1, random: () => 0 });
  assert.deepEqual(result, { kind: "technical-limit" });
});
