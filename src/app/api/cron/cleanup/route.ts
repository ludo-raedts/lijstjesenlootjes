import { NextRequest } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { purgeExpired } from "@/lib/data-lifecycle";
import { errorResponse, noStoreJson } from "@/lib/http";
import { HttpError } from "@/lib/api-error";
import { cleanupMeasurementRetention, transaction } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Idempotent. */
export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) throw new HttpError(401, "cron_unauthorized");
    const report = await transaction((database) => purgeExpired(database));
    await cleanupMeasurementRetention();
    // Counts only: never log names, wishes, tokens, links or identifiers.
    console.info("retention_cleanup_completed", JSON.stringify(report));
    return noStoreJson({ purged: report });
  } catch (error) {
    return errorResponse(error);
  }
}
