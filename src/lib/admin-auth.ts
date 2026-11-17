import "server-only";

import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "ll_theme_admin_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const loginAttempts = new Map<string, { attempts: number; resetsAt: number }>();

function getCredentials() {
  return {
    password: process.env.THEME_ADMIN_PASSWORD ?? "",
    sessionSecret: process.env.THEME_ADMIN_SESSION_SECRET ?? "",
  };
}

export function isAdminConfigured() {
  const { password, sessionSecret } = getCredentials();
  return password.length >= 12 && sessionSecret.length >= 32;
}

function equalSecret(value: string, expected: string) {
  const left = createHash("sha256").update(value).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function sign(expiresAt: string) {
  return createHmac("sha256", getCredentials().sessionSecret)
    .update(`theme-admin:${expiresAt}`)
    .digest("base64url");
}

export function allowAdminLogin(identifier: string) {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);
  if (!entry || entry.resetsAt <= now) {
    loginAttempts.set(identifier, { attempts: 1, resetsAt: now + 15 * 60 * 1000 });
    return true;
  }
  entry.attempts += 1;
  return entry.attempts <= 8;
}

export function verifyAdminPassword(password: string) {
  const credentials = getCredentials();
  return isAdminConfigured() && equalSecret(password, credentials.password);
}

export async function createAdminSession() {
  const expiresAt = String(Date.now() + SESSION_DURATION_MS);
  const value = `${expiresAt}.${sign(expiresAt)}`;
  (await cookies()).set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export async function hasAdminSession() {
  if (!isAdminConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const [expiresAt, providedSignature, ...rest] = value.split(".");
  if (rest.length || !/^\d{13}$/.test(expiresAt) || !providedSignature) return false;
  if (Number(expiresAt) <= Date.now()) return false;
  return equalSecret(providedSignature, sign(expiresAt));
}

export async function deleteAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
