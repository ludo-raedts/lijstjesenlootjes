import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { purgeExpired } from "@/lib/data-lifecycle";
import { errorResponse, noStoreJson } from "@/lib/http";
import { HttpError } from "@/lib/api-error";
import { transaction } from "@/lib/store";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

/** Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Idempotent. */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) throw new HttpError(401, "cron_unauthorized");
    const report = await transaction((database) => purgeExpired(database));
    // Counts only: never log names, wishes, tokens, links or identifiers.
    console.info("retention_cleanup_completed", JSON.stringify(report));
    return noStoreJson({ purged: report });
  } catch (error) {
    return errorResponse(error);
  }
}
