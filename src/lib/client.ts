"use client";

import { getActiveLocale } from "@/i18n/config";
import { translateApiError } from "@/i18n/api-errors";
import { isApiErrorCode, type ApiErrorCode, type ApiErrorParams } from "@/lib/api-error";

/** An API failure with its stable code, so screens can react to the cause and not just show the text. */
export class ApiError extends Error {
  constructor(public code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const LINK_PROBLEM_CODES: readonly ApiErrorCode[] = [
  "access_link_invalid",
  "access_link_expired",
  "access_link_replaced",
  "session_required",
  "session_expired",
  "access_revoked",
];

/** The code when the error is about the personal link itself (expired, replaced, missing), else undefined. */
export function linkProblemCode(error: unknown): ApiErrorCode | undefined {
  return error instanceof ApiError && LINK_PROBLEM_CODES.includes(error.code) ? error.code : undefined;
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const data = (await response.json()) as T & {
    error?: { code?: unknown; params?: ApiErrorParams };
  };
  if (!response.ok) {
    const code = isApiErrorCode(data.error?.code) ? data.error.code : "internal_error";
    throw new ApiError(code, translateApiError(code, data.error?.params, getActiveLocale()));
  }
  return data;
}

export function tokenFromFragment() {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? undefined;
}

export async function ensureSession() {
  const token = tokenFromFragment();
  if (!token) return false;
  await api("/api/session/exchange", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  window.history.replaceState(null, "", window.location.pathname);
  return true;
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}
