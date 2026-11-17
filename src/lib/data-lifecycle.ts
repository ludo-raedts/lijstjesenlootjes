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
