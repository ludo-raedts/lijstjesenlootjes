"use client";

import { getActiveLocale } from "@/i18n/config";
import { translateApiError } from "@/i18n/api-errors";
import { isApiErrorCode, type ApiErrorParams } from "@/lib/api-error";

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
    throw new Error(translateApiError(code, data.error?.params, getActiveLocale()));
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
