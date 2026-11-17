import { buildHealthReport, withTimeout, type HealthCheckResult } from "@/lib/health";
import { noStoreJson } from "@/lib/http";
import { checkDatabaseHealth } from "@/lib/store";

export const dynamic = "force-dynamic";

const DATABASE_TIMEOUT_MS = 4000;

/**
 * Public liveness and database-connectivity check for uptime monitors.
 * It never returns database contents, configuration, or error details.
 */
export async function GET() {
  let database: HealthCheckResult = "error";
  try {
    database = (await withTimeout(checkDatabaseHealth(), DATABASE_TIMEOUT_MS)) ? "ok" : "error";
  } catch (error) {
    console.error("health_check_failed", error instanceof Error ? error.message : "non-error thrown");
  }

  const report = buildHealthReport(database);
  return noStoreJson(report, { status: report.status === "ok" ? 200 : 503 });
}
