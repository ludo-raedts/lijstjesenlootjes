import { NextResponse } from "next/server";
import { HttpError } from "@/lib/api-error";

export const SMALL_BODY_BYTES = 8 * 1024;
export const LIST_BODY_BYTES = 256 * 1024;
export const DRAW_BODY_BYTES = 1024 * 1024;

/** Reads a JSON object body with a size cap; malformed or oversized input is a client error, not a 500. */
export async function readJson(request: Request, maxBytes = SMALL_BODY_BYTES): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "payload_too_large");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw new HttpError(413, "payload_too_large");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "invalid_json");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "invalid_json");
  }
  return parsed as Record<string, unknown>;
}

export function noStoreJson(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return noStoreJson(
      { error: { code: error.code, params: error.params } },
      { status: error.status },
    );
  }
  console.error("Unhandled API error:", error instanceof Error ? error.message : "non-error thrown");
  return noStoreJson(
    { error: { code: "internal_error" } },
    { status: 500 },
  );
}
