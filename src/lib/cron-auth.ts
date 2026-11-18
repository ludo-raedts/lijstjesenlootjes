import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Constant-time, and refuses a missing or short secret. */
export function isCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
