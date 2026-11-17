import type { Database } from "@/lib/types";

export function purgeDeletedWishlists(database: Database) {
  const deletedScopeIds = new Set(
    database.wishlists
      .filter((wishlist) => wishlist.deletedAt)
      .map((wishlist) => wishlist.id),
  );

  if (deletedScopeIds.size === 0) return;

  database.wishlists = database.wishlists.filter(
    (wishlist) => !deletedScopeIds.has(wishlist.id),
  );
  database.accessTokens = database.accessTokens.filter(
    (token) => !deletedScopeIds.has(token.scopeId),
  );
  database.sessions = database.sessions.filter(
    (session) => !deletedScopeIds.has(session.scopeId),
  );
}

export const RETENTION = {
  drawDaysAfterEventDate: 45,
  drawDaysAfterCreationWithoutEventDate: 90,
  wishlistMonthsWithoutUpdate: 12,
} as const;

export type PurgeReport = {
  wishlists: number;
  draws: number;
  accessTokens: number;
  sessions: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseTime(value: string | undefined) {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

/** Event dates are stored as YYYY-MM-DD and are treated as the end of that day in UTC. */
export function drawExpiresAt(draw: Pick<Database["draws"][number], "date" | "createdAt">) {
  const eventDay = draw.date ? parseTime(`${draw.date}T23:59:59.999Z`) : undefined;
  if (eventDay !== undefined) {
    return eventDay + RETENTION.drawDaysAfterEventDate * DAY_MS;
  }
  const created = parseTime(draw.createdAt);
  if (created === undefined) return undefined;
  return created + RETENTION.drawDaysAfterCreationWithoutEventDate * DAY_MS;
}

export function wishlistExpiresAt(
  wishlist: Pick<Database["wishlists"][number], "updatedAt" | "createdAt">,
) {
  const lastChange = parseTime(wishlist.updatedAt) ?? parseTime(wishlist.createdAt);
  if (lastChange === undefined) return undefined;
  const expiry = new Date(lastChange);
  expiry.setUTCMonth(expiry.getUTCMonth() + RETENTION.wishlistMonthsWithoutUpdate);
  return expiry.getTime();
}

/**
 * Removes expired wishlists and draws together with every token and session that points at
 * them, plus tokens and sessions that are expired or orphaned. Running it twice is a no-op.
 */
export function purgeExpired(database: Database, now: number = Date.now()): PurgeReport {
  const before = {
    wishlists: database.wishlists.length,
    draws: database.draws.length,
    accessTokens: database.accessTokens.length,
    sessions: database.sessions.length,
  };

  database.wishlists = database.wishlists.filter((wishlist) => {
    const expiresAt = wishlistExpiresAt(wishlist);
    return expiresAt === undefined || expiresAt > now;
  });
  database.draws = database.draws.filter((draw) => {
    const expiresAt = drawExpiresAt(draw);
    return expiresAt === undefined || expiresAt > now;
  });

  const liveScopes = new Set([
    ...database.wishlists.map(({ id }) => id),
    ...database.draws.map(({ id }) => id),
  ]);
  database.accessTokens = database.accessTokens.filter((token) => {
    const expiresAt = parseTime(token.expiresAt);
    return liveScopes.has(token.scopeId) && (expiresAt === undefined || expiresAt > now);
  });
  database.sessions = database.sessions.filter((session) => {
    const expiresAt = parseTime(session.expiresAt);
    return liveScopes.has(session.scopeId) && (expiresAt === undefined || expiresAt > now);
  });

  return {
    wishlists: before.wishlists - database.wishlists.length,
    draws: before.draws - database.draws.length,
    accessTokens: before.accessTokens - database.accessTokens.length,
    sessions: before.sessions - database.sessions.length,
  };
}
