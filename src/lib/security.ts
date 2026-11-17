import "server-only";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError } from "@/lib/api-error";
import { createRateLimitBucketKey } from "@/lib/rate-limit";
import { consumeRateLimit, read, transaction } from "@/lib/store";
import { AccessRole, AccessToken, Session } from "@/lib/types";

const SESSION_DAYS = 7;

export { HttpError } from "@/lib/api-error";

export function id() {
  return randomUUID();
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function futureIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function createAccessToken(
  role: AccessRole,
  scopeId: string,
  expiresAt: string,
  participantId?: string,
): { raw: string; record: AccessToken } {
  const raw = newToken();
  return {
    raw,
    record: {
      hash: tokenHash(raw),
      role,
      scopeId,
      participantId,
      expiresAt,
    },
  };
}

export function createSession(access: AccessToken): { raw: string; record: Session } {
  const raw = newToken();
  return {
    raw,
    record: {
      hash: tokenHash(raw),
      accessHash: access.hash,
      role: access.role,
      scopeId: access.scopeId,
      participantId: access.participantId,
      expiresAt: futureIso(SESSION_DAYS),
    },
  };
}

export function cookieName(role: AccessRole) {
  return `ll_${role}_session`;
}

export async function exchangeToken(rawToken: string) {
  if (!/^[A-Za-z0-9_-]{40,}$/.test(rawToken)) {
    throw new HttpError(401, "access_link_invalid");
  }
  const hash = tokenHash(rawToken);
  return transaction((database) => {
    const access = database.accessTokens.find((candidate) => candidate.hash === hash);
    if (!access) throw new HttpError(401, "access_link_invalid");
    if (access.revokedAt) throw new HttpError(401, "access_link_replaced");
    if (new Date(access.expiresAt).getTime() <= Date.now()) {
      throw new HttpError(401, "access_link_expired");
    }
    const session = createSession(access);
    database.sessions = database.sessions.filter(
      (candidate) => new Date(candidate.expiresAt).getTime() > Date.now(),
    );
    database.sessions.push(session.record);
    return { access, session };
  });
}

export async function requireSession(request: NextRequest, role: AccessRole) {
  const raw = request.cookies.get(cookieName(role))?.value;
  if (!raw) throw new HttpError(401, "session_required");
  const hash = tokenHash(raw);
  return read((database) => {
    const session = database.sessions.find(
      (candidate) => candidate.hash === hash && candidate.role === role,
    );
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new HttpError(401, "session_expired");
    }
    const access = database.accessTokens.find(
      (candidate) => candidate.hash === session.accessHash,
    );
    if (!access || access.revokedAt || new Date(access.expiresAt).getTime() <= Date.now()) {
      throw new HttpError(401, "access_revoked");
    }
    return session;
  });
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = new URL(request.url).origin;
  if (!origin || origin !== expected) {
    throw new HttpError(403, "invalid_origin");
  }
}

function rateLimitSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("The server is missing the Supabase secret server key.");
  }
  return secret;
}

export async function limitIdentifier(
  identifier: string,
  key: string,
  maximum = 40,
  windowSeconds = 60,
) {
  if (!await isWithinRateLimit(identifier, key, maximum, windowSeconds)) {
    throw new HttpError(429, "rate_limited");
  }
}

export async function isWithinRateLimit(
  identifier: string,
  key: string,
  maximum = 40,
  windowSeconds = 60,
) {
  const bucketKey = createRateLimitBucketKey(identifier, key, rateLimitSecret());
  return consumeRateLimit(bucketKey, maximum, windowSeconds);
}

export async function limit(request: NextRequest, key: string, maximum = 40, windowSeconds = 60) {
  const identifier = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  await limitIdentifier(identifier, key, maximum, windowSeconds);
}

export function secureRandomInt(maxExclusive: number) {
  return randomInt(0, maxExclusive);
}
