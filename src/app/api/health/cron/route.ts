import { evaluateCronHealth } from "@/lib/cron-health";
import { noStoreJson } from "@/lib/http";
import { read } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * For an uptime monitor: 200 while the daily cleanup and reminder jobs have run within the last 36 hours (or have not
 * run yet on a fresh deployment), 503 when one is overdue. Returns job names and states only, never data.
 */
export async function GET() {
  try {
    const report = await read((database) => evaluateCronHealth(database));
    return noStoreJson({ ...report, timestamp: new Date().toISOString() }, { status: report.status === "ok" ? 200 : 503 });
  } catch (error) {
    console.error("cron_health_check_failed", error instanceof Error ? error.message : "non-error thrown");
    return noStoreJson({ status: "degraded", timestamp: new Date().toISOString() }, { status: 503 });
  }
}
