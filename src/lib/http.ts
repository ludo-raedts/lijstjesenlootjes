import { NextResponse } from "next/server";
import { HttpError } from "@/lib/api-error";

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
