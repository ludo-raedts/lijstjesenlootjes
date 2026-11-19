import type { Database } from "@/lib/types";

export const cronJobs = ["cleanup", "reminders"] as const;
export type CronJob = (typeof cronJobs)[number];
export type CronJobState = "ok" | "stale" | "waiting";

/** Both jobs run daily; a day and a half without a run means the schedule is broken. */
export const CRON_MAX_AGE_MS = 36 * 60 * 60 * 1000;

/** Notes that a scheduled job ran (a timestamp only, no data). Call inside the transaction the job already makes. */
export function recordCronRun(database: Database, job: CronJob, now: Date = new Date()) {
  const settings = (database.siteSettings ??= {});
  settings.cronRuns = { ...settings.cronRuns, [job]: now.toISOString() };
}

/** `waiting` means no run has been recorded yet (a fresh deployment before its first schedule); it is not an alarm. */
export function evaluateCronHealth(
  database: Database,
  now: Date = new Date(),
): { status: "ok" | "degraded"; jobs: Record<CronJob, CronJobState> } {
  const jobs = {} as Record<CronJob, CronJobState>;
  for (const job of cronJobs) {
    const ranAt = database.siteSettings?.cronRuns?.[job];
    const time = ranAt ? Date.parse(ranAt) : Number.NaN;
    jobs[job] = Number.isNaN(time) ? "waiting" : now.getTime() - time > CRON_MAX_AGE_MS ? "stale" : "ok";
  }
  const stale = cronJobs.some((job) => jobs[job] === "stale");
  return { status: stale ? "degraded" : "ok", jobs };
}
