import assert from "node:assert/strict";
import test from "node:test";
import { drawExpiresAt, purgeDeletedWishlists, purgeExpired, wishlistExpiresAt } from "../src/lib/data-lifecycle";
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

const future = "2099-01-01T00:00:00.000Z";

function sampleDatabase(): Database {
  return {
    version: 1,
    wishlists: [
      { id: "stale-list", title: "Stale", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-06-01T00:00:00.000Z", wishes: [] },
      { id: "legacy-stale", title: "Legacy", createdAt: "2025-01-01T00:00:00.000Z", wishes: [] },
      { id: "fresh-list", title: "Fresh", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z", wishes: [] },
    ],
    draws: [
      { id: "past-event", requestId: "r1", organizerName: "A", date: "2026-01-01", createdAt: "2025-12-01T00:00:00.000Z", status: "complete", participants: [], exclusions: [], assignments: [] },
      { id: "recent-event", requestId: "r2", organizerName: "A", date: "2026-11-01", createdAt: "2026-10-01T00:00:00.000Z", status: "complete", participants: [], exclusions: [], assignments: [] },
      { id: "undated-old", requestId: "r3", organizerName: "A", createdAt: "2026-06-01T00:00:00.000Z", status: "complete", participants: [], exclusions: [], assignments: [] },
      { id: "undated-new", requestId: "r4", organizerName: "A", createdAt: "2026-10-01T00:00:00.000Z", status: "complete", participants: [], exclusions: [], assignments: [] },
    ],
    accessTokens: [
      { hash: "t-stale", role: "wishlist_manage", scopeId: "stale-list", expiresAt: future },
      { hash: "t-fresh", role: "wishlist_manage", scopeId: "fresh-list", expiresAt: future },
      { hash: "t-expired", role: "wishlist_guest", scopeId: "fresh-list", expiresAt: "2026-01-01T00:00:00.000Z" },
      { hash: "t-orphan", role: "draw_admin", scopeId: "missing", expiresAt: future },
      { hash: "t-past-event", role: "draw_admin", scopeId: "past-event", expiresAt: future },
      { hash: "t-new-draw", role: "draw_admin", scopeId: "undated-new", expiresAt: future },
    ],
    sessions: [
      { hash: "s-stale", accessHash: "t-stale", role: "wishlist_manage", scopeId: "stale-list", expiresAt: future },
      { hash: "s-fresh", accessHash: "t-fresh", role: "wishlist_manage", scopeId: "fresh-list", expiresAt: future },
      { hash: "s-old", accessHash: "t-fresh", role: "wishlist_manage", scopeId: "fresh-list", expiresAt: "2026-01-01T00:00:00.000Z" },
    ],
  };
}

const now = Date.parse("2026-11-17T12:00:00.000Z");

test("expiry follows the retention policy", () => {
  assert.equal(drawExpiresAt({ date: "2026-01-01", createdAt: "2025-12-01T00:00:00.000Z" }), Date.parse("2026-02-15T23:59:59.999Z"));
  assert.equal(drawExpiresAt({ createdAt: "2026-06-01T00:00:00.000Z" }), Date.parse("2026-08-30T00:00:00.000Z"));
  assert.equal(wishlistExpiresAt({ createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-06-01T00:00:00.000Z" }), Date.parse("2026-06-01T00:00:00.000Z"));
  assert.equal(wishlistExpiresAt({ createdAt: "2025-01-01T00:00:00.000Z" }), Date.parse("2026-01-01T00:00:00.000Z"));
});

test("purgeExpired removes expired scopes with their tokens and sessions", () => {
  const database = sampleDatabase();
  const report = purgeExpired(database, now);

  assert.deepEqual(database.wishlists.map(({ id }) => id), ["fresh-list"]);
  assert.deepEqual(database.draws.map(({ id }) => id), ["recent-event", "undated-new"]);
  assert.deepEqual(database.accessTokens.map(({ hash }) => hash), ["t-fresh", "t-new-draw"]);
  assert.deepEqual(database.sessions.map(({ hash }) => hash), ["s-fresh"]);
  assert.deepEqual(report, { wishlists: 2, draws: 2, accessTokens: 4, sessions: 2 });
});

test("purgeExpired is idempotent", () => {
  const database = sampleDatabase();
  purgeExpired(database, now);
  const snapshot = JSON.stringify(database);
  assert.deepEqual(purgeExpired(database, now), { wishlists: 0, draws: 0, accessTokens: 0, sessions: 0 });
  assert.equal(JSON.stringify(database), snapshot);
});
