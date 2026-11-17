import assert from "node:assert/strict";
import test from "node:test";
import { drawExpiresAt, syncDrawAccess } from "../src/lib/data-lifecycle";
import type { AccessToken, Database, Draw } from "../src/lib/types";

const draw = (overrides: Partial<Draw> = {}): Draw => ({
  id: "d1",
  requestId: "r1",
  organizerName: "Alex",
  createdAt: "2026-11-01T10:00:00.000Z",
  status: "complete",
  participants: [],
  exclusions: [],
  assignments: [],
  ...overrides,
});

const token = (overrides: Partial<AccessToken>): AccessToken => ({
  hash: "h",
  role: "draw_participant",
  scopeId: "d1",
  expiresAt: "2026-12-01T00:00:00.000Z",
  ...overrides,
});

const database = (tokens: AccessToken[]): Database => ({
  version: 1,
  wishlists: [],
  draws: [],
  accessTokens: tokens,
  sessions: [],
});

test("moving the date moves every live link of the draw to the new expiry", () => {
  const target = draw({ date: "2027-03-01" });
  const db = database([
    token({ hash: "a", role: "draw_admin" }),
    token({ hash: "b" }),
    token({ hash: "c", revokedAt: "2026-11-02T00:00:00.000Z" }),
    token({ hash: "d", scopeId: "other" }),
    token({ hash: "e", role: "wishlist_manage" }),
  ]);
  const iso = syncDrawAccess(db, target);
  assert.equal(iso, new Date(drawExpiresAt(target)!).toISOString());
  const byHash = Object.fromEntries(db.accessTokens.map((item) => [item.hash, item.expiresAt]));
  assert.equal(byHash.a, iso);
  assert.equal(byHash.b, iso);
  assert.equal(byHash.c, "2026-12-01T00:00:00.000Z", "revoked links are left alone");
  assert.equal(byHash.d, "2026-12-01T00:00:00.000Z", "other scopes are left alone");
  assert.equal(byHash.e, "2026-12-01T00:00:00.000Z", "wishlist links are left alone");
});

test("clearing the date falls back to 90 days after creation", () => {
  const target = draw({ date: undefined });
  const db = database([token({ hash: "a" })]);
  const iso = syncDrawAccess(db, target)!;
  assert.equal(iso.slice(0, 10), "2027-01-30");
  assert.equal(db.accessTokens[0].expiresAt, iso);
});
