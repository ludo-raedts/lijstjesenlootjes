import { NextRequest } from "next/server";
import { isPublicTrafficPageKey, normalizeTrafficCountry, type TrafficAdjustment } from "@/lib/analytics";
import { findSiteDomain } from "@/lib/domains";
import { errorResponse, readJson } from "@/lib/http";
import { hasPath } from "@/lib/paths";
import { assertSameOrigin, HttpError } from "@/lib/security";
import { excludeTrafficMeasurement } from "@/lib/store";

const MAX_PAGE_VIEWS_PER_PAGE = 100;

function parseMeasurements(value: unknown, locale: "nl" | "en"): TrafficAdjustment[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 7) {
    throw new HttpError(400, "invalid_traffic_measurement");
  }
  const measurements = value.map((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      throw new HttpError(400, "invalid_traffic_measurement");
    }
    const row = candidate as Record<string, unknown>;
    if (
      !isPublicTrafficPageKey(row.page) ||
      !hasPath(row.page, locale) ||
      !Number.isInteger(row.pageViews) ||
      Number(row.pageViews) < 1 ||
      Number(row.pageViews) > MAX_PAGE_VIEWS_PER_PAGE ||
      !Number.isInteger(row.visits) ||
      Number(row.visits) < 0 ||
      Number(row.visits) > Number(row.pageViews)
    ) {
      throw new HttpError(400, "invalid_traffic_measurement");
    }
    return {
      page: row.page,
      pageViews: Number(row.pageViews),
      visits: Number(row.visits),
    };
  });
  if (new Set(measurements.map(({ page }) => page)).size !== measurements.length) {
    throw new HttpError(400, "invalid_traffic_measurement");
  }
  return measurements;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const site = findSiteDomain(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
    if (!site) throw new HttpError(400, "invalid_traffic_measurement");
    const measurements = parseMeasurements(body.measurements, site.locale);
    const country = normalizeTrafficCountry(request.headers.get("x-vercel-ip-country"));
    await excludeTrafficMeasurement(site.locale, measurements, country);
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
