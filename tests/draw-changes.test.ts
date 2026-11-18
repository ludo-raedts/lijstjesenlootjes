import assert from "node:assert/strict";
import test from "node:test";
import { isReminderDue, isReminderStale, reminderSendOn } from "../src/lib/reminders";
import { planRedraw } from "../src/lib/redraw";
import { parseSealKey, seal, unseal } from "../src/lib/secret-box";

const people = ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase() }));
let counter = 0;
const newId = () => `new-${(counter += 1)}`;

test("redraw: adding someone keeps existing people and gives everyone a valid recipient", () => {
  const plan = planRedraw({ participants: people.map((p) => ({ ...p, activeTokenHash: "x" })), exclusions: [] }, { addNames: ["E"], removeIds: [] }, newId);
  assert.equal(plan.participants.length, 5);
  assert.equal(plan.addedIds.length, 1);
  assert.equal(new Set(plan.assignments.map((a) => a.recipientId)).size, 5);
  assert.ok(plan.assignments.every((a) => a.giverId !== a.recipientId));
});

test("redraw: removing someone drops their exclusions and never assigns them", () => {
  const plan = planRedraw(
    { participants: people.map((p) => ({ ...p, activeTokenHash: "x" })), exclusions: [{ from: "a", to: "d" }, { from: "a", to: "b" }] },
    { addNames: [], removeIds: ["d"] },
    newId,
  );
  assert.deepEqual(plan.exclusions, [{ from: "a", to: "b" }]);
  assert.ok(plan.assignments.every((a) => a.giverId !== "d" && a.recipientId !== "d"));
  assert.ok(plan.assignments.every((a) => !(a.giverId === "a" && a.recipientId === "b")));
});

test("redraw: refuses fewer than three people, unknown ids and impossible exclusions", () => {
  const draw = { participants: people.map((p) => ({ ...p, activeTokenHash: "x" })), exclusions: [] };
  assert.throws(() => planRedraw(draw, { addNames: [], removeIds: ["c", "d"] }, newId), (e: { code?: string }) => e.code === "invalid_participant_count");
  assert.throws(() => planRedraw(draw, { addNames: [], removeIds: ["zzz"] }, newId), (e: { code?: string }) => e.code === "participant_not_found");
  const tight = { participants: people.slice(0, 3).map((p) => ({ ...p, activeTokenHash: "x" })), exclusions: [{ from: "a", to: "b" }, { from: "a", to: "c" }] };
  assert.throws(() => planRedraw(tight, { addNames: [], removeIds: [] }, newId), (e: { code?: string }) => e.code === "draw_impossible");
});

test("reminder day: three days before the date, never in the past, and only for a future date", () => {
  assert.equal(reminderSendOn("2026-12-05", "2026-11-18"), "2026-12-02");
  assert.equal(reminderSendOn("2026-11-20", "2026-11-18"), "2026-11-18");
  assert.equal(reminderSendOn("2026-11-18", "2026-11-18"), undefined);
  assert.equal(reminderSendOn(undefined, "2026-11-18"), undefined);
});

test("a reminder is due on its day and stale once the occasion has passed", () => {
  const reminder = { emailSealed: "x", sendOn: "2026-12-02", locale: "nl" as const };
  assert.equal(isReminderDue({ reminder, date: "2026-12-05" }, "2026-12-01"), false);
  assert.equal(isReminderDue({ reminder, date: "2026-12-05" }, "2026-12-02"), true);
  assert.equal(isReminderDue({ reminder, date: "2026-12-05" }, "2026-12-06"), false);
  assert.equal(isReminderStale({ reminder, date: "2026-12-05" }, "2026-12-06"), true);
  assert.equal(isReminderStale({ reminder, date: undefined }, "2026-12-01"), true);
  assert.equal(isReminderStale({ reminder: undefined, date: "2026-12-05" }, "2026-12-06"), false);
});

test("sealed text opens only with the right key and detects tampering", () => {
  const key = parseSealKey(Buffer.alloc(32, 7).toString("base64"))!;
  const other = parseSealKey(Buffer.alloc(32, 8).toString("base64"))!;
  const sealed = seal("a@example.nl", key);
  assert.ok(!sealed.includes("example"));
  assert.equal(unseal(sealed, key), "a@example.nl");
  assert.equal(unseal(sealed, other), undefined);
  assert.equal(unseal(`${sealed.slice(0, -2)}AA`, key), undefined);
  assert.equal(unseal("garbage", key), undefined);
  assert.equal(parseSealKey("too-short"), undefined);
  assert.equal(parseSealKey(undefined), undefined);
});
