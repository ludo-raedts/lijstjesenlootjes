import assert from "node:assert/strict";
import test from "node:test";
import { purgeDeletedWishlists } from "../src/lib/data-lifecycle";
import type { Database } from "../src/lib/types";

test("purging a deleted wishlist also removes its access records", () => {
  const database: Database = {
    version: 1,
    wishlists: [
      { id: "deleted", title: "Old", createdAt: "2026-01-01T00:00:00.000Z", deletedAt: "2026-02-01T00:00:00.000Z", wishes: [] },
      { id: "active", title: "Current", createdAt: "2026-03-01T00:00:00.000Z", wishes: [] },
    ],
    draws: [],
    accessTokens: [
      { hash: "old-token", role: "wishlist_manage", scopeId: "deleted", expiresAt: "2027-01-01T00:00:00.000Z" },
      { hash: "active-token", role: "wishlist_manage", scopeId: "active", expiresAt: "2027-01-01T00:00:00.000Z" },
    ],
    sessions: [
      { hash: "old-session", accessHash: "old-token", role: "wishlist_manage", scopeId: "deleted", expiresAt: "2027-01-01T00:00:00.000Z" },
      { hash: "active-session", accessHash: "active-token", role: "wishlist_manage", scopeId: "active", expiresAt: "2027-01-01T00:00:00.000Z" },
    ],
  };

  purgeDeletedWishlists(database);

  assert.deepEqual(database.wishlists.map(({ id }) => id), ["active"]);
  assert.deepEqual(database.accessTokens.map(({ scopeId }) => scopeId), ["active"]);
  assert.deepEqual(database.sessions.map(({ scopeId }) => scopeId), ["active"]);
});
