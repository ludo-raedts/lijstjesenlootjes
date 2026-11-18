import { NextRequest } from "next/server";
import { findSiteDomain } from "@/lib/domains";
import { errorResponse, readJson } from "@/lib/http";
import { getPage, hasPath } from "@/lib/paths";
import { assertSameOrigin, HttpError } from "@/lib/security";
import { isPublicTrafficPageKey, normalizeTrafficCountry } from "@/lib/analytics";
import { recordTrafficMeasurement } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const site = findSiteDomain(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
    if (
      !site ||
      !isPublicTrafficPageKey(body.page) ||
      getPage(body.page).visibility !== "public" ||
      !hasPath(body.page, site.locale) ||
      typeof body.visit !== "boolean"
    ) {
      throw new HttpError(400, "invalid_traffic_measurement");
    }
    const country = normalizeTrafficCountry(request.headers.get("x-vercel-ip-country"));
    await recordTrafficMeasurement(site.locale, body.page, body.visit, country);
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
