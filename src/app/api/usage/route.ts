import { NextRequest } from "next/server";
import { errorResponse, readJson } from "@/lib/http";
import { assertSameOrigin, HttpError, limit } from "@/lib/security";
import { recordUsage } from "@/lib/store";
import { isClientUsageEvent } from "@/lib/usage";

/** Browser-reported interface counters (call-to-action clicks, link copies). Only allowlisted event names count. */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await limit(request, "client-usage", 30, 60);
    const body = await readJson(request);
    if (!isClientUsageEvent(body.event)) throw new HttpError(400, "invalid_usage_event");
    await recordUsage(body.event);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
