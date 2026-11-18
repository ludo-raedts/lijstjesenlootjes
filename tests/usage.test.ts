import assert from "node:assert/strict";
import test from "node:test";
import { amsterdamDay, buildUsageSeries, previousYearWindow, summarizeStock, totalUsage } from "../src/lib/usage";
import type { Database } from "../src/lib/types";

const now = new Date("2026-11-17T12:00:00.000Z");

test("the usage series fills missing days with zeros, oldest first", () => {
  const series = buildUsageSeries(
    [
      { day: "2026-11-17", event: "wishlist_created", eventCount: 3 },
      { day: "2026-11-15", event: "draw_created", eventCount: 2 },
      { day: "2026-11-15", event: "unknown_event", eventCount: 9 },
      { day: "2026-01-01", event: "wishlist_created", eventCount: 5 },
    ],
    4,
    now,
  );
  assert.deepEqual(series.map(({ day }) => day), ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"]);
  assert.equal(series[1].counts.draw_created, 2);
  assert.equal(series[3].counts.wishlist_created, 3);
  assert.deepEqual(totalUsage(series), {
    wishlist_created: 3,
    shared_wishlist_opened: 0,
    reservation_made: 0,
    draw_created: 2,
    participant_links_issued: 0,
    personal_link_opened: 0,
    admin_login: 0,
  });
});

test("the prior-year window compares the same calendar days", () => {
  const series = buildUsageSeries(
    [
      { day: "2025-10-19", event: "wishlist_created", eventCount: 1 },
      { day: "2025-11-17", event: "wishlist_created", eventCount: 2 },
      { day: "2026-11-17", event: "wishlist_created", eventCount: 9 },
    ],
    800,
    now,
  );
  assert.equal(totalUsage(previousYearWindow(series, 30, now)).wishlist_created, 3);
});

test("days are bucketed in Europe/Amsterdam time", () => {
  assert.equal(amsterdamDay(new Date("2026-11-17T23:30:00.000Z")), "2026-11-18");
  assert.equal(amsterdamDay(new Date("2026-06-17T21:30:00.000Z")), "2026-06-17");
});

test("the stock summary contains counts and dates only", () => {
  const database: Database = {
    version: 1,
    wishlists: [
      {
        id: "w1", title: "Private title", createdAt: "2025-12-01T00:00:00.000Z", updatedAt: "2025-12-10T00:00:00.000Z",
        wishes: [
          { id: "a", title: "Secret wish", reservation: { ownerSessionHash: "h", reservedAt: "2026-01-01T00:00:00.000Z" } },
          { id: "b", title: "Other wish" },
        ],
      },
    ],
    draws: [
      {
        id: "d1", requestId: "r", organizerName: "Private name", date: "2026-12-01", createdAt: "2026-10-01T00:00:00.000Z",
        status: "complete", exclusions: [], assignments: [],
        participants: [{ id: "p1", name: "Ann", activeTokenHash: "t1" }, { id: "p2", name: "Bo", activeTokenHash: "t2" }],
      },
    ],
    accessTokens: [
      { hash: "t1", role: "draw_participant", scopeId: "d1", participantId: "p1", expiresAt: "2027-01-01T00:00:00.000Z" },
      { hash: "t2", role: "draw_participant", scopeId: "d1", participantId: "p2", expiresAt: "2027-01-01T00:00:00.000Z", revokedAt: "2026-11-01T00:00:00.000Z" },
      { hash: "t3", role: "draw_admin", scopeId: "d1", expiresAt: "2027-01-01T00:00:00.000Z" },
    ],
    sessions: [],
  };
  const summary = summarizeStock(database, now.getTime());
  assert.deepEqual(summary, {
    activeWishlists: 1,
    activeDraws: 1,
    participants: 2,
    reservedWishes: 1,
    openPersonalLinks: 1,
    oldestWishlistDay: "2025-12-01",
    oldestDrawDay: "2026-10-01",
    expiringWithin30Days: 1,
  });
  const serialized = JSON.stringify(summary);
  for (const secret of ["Private", "Secret", "Ann", "Bo"]) assert.ok(!serialized.includes(secret));
});
