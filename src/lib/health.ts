export type HealthCheckResult = "ok" | "error";

export type HealthReport = {
  status: "ok" | "degraded";
  checks: { database: HealthCheckResult };
  timestamp: string;
};

export function buildHealthReport(
  database: HealthCheckResult,
  now: Date = new Date(),
): HealthReport {
  return {
    status: database === "ok" ? "ok" : "degraded",
    checks: { database },
    timestamp: now.toISOString(),
  };
}

export async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), milliseconds);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
