import assert from "node:assert/strict";
import test from "node:test";
import { CRON_MAX_AGE_MS, evaluateCronHealth, recordCronRun } from "../src/lib/cron-health";
import { emptyDatabase } from "../src/lib/types";

const now = new Date("2026-11-19T12:00:00.000Z");

test("a fresh deployment is waiting, not degraded", () => {
  const report = evaluateCronHealth(emptyDatabase(), now);
  assert.deepEqual(report, { status: "ok", jobs: { cleanup: "waiting", reminders: "waiting" } });
});

test("recorded runs are ok until they are older than 36 hours", () => {
  const database = emptyDatabase();
  recordCronRun(database, "cleanup", new Date(now.getTime() - 60_000));
  recordCronRun(database, "reminders", new Date(now.getTime() - CRON_MAX_AGE_MS + 60_000));
  assert.deepEqual(evaluateCronHealth(database, now), { status: "ok", jobs: { cleanup: "ok", reminders: "ok" } });
  recordCronRun(database, "reminders", new Date(now.getTime() - CRON_MAX_AGE_MS - 60_000));
  assert.deepEqual(evaluateCronHealth(database, now), { status: "degraded", jobs: { cleanup: "ok", reminders: "stale" } });
});

test("recording a run keeps the theme settings and the other job", () => {
  const database = emptyDatabase();
  database.siteSettings = { theme: { mode: "automatic" } as never };
  recordCronRun(database, "cleanup", now);
  recordCronRun(database, "reminders", now);
  assert.ok(database.siteSettings.theme);
  assert.equal(database.siteSettings.cronRuns?.cleanup, now.toISOString());
  assert.equal(database.siteSettings.cronRuns?.reminders, now.toISOString());
});
