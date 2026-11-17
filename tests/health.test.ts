import assert from "node:assert/strict";
import test from "node:test";
import { buildHealthReport, withTimeout } from "../src/lib/health";

test("a healthy database yields an ok report", () => {
  const report = buildHealthReport("ok", new Date("2026-11-17T12:00:00.000Z"));
  assert.deepEqual(report, {
    status: "ok",
    checks: { database: "ok" },
    timestamp: "2026-11-17T12:00:00.000Z",
  });
});

test("a failing database yields a degraded report without details", () => {
  const report = buildHealthReport("error");
  assert.equal(report.status, "degraded");
  assert.deepEqual(Object.keys(report).sort(), ["checks", "status", "timestamp"]);
});

test("withTimeout rejects slow checks and passes fast ones through", async () => {
  assert.equal(await withTimeout(Promise.resolve(7), 50), 7);
  await assert.rejects(withTimeout(new Promise(() => undefined), 20), /timeout/);
});
