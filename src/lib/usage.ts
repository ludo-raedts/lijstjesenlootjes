import { drawExpiresAt, wishlistExpiresAt } from "@/lib/data-lifecycle";
import type { Database } from "@/lib/types";

export const usageEvents = [
  "wishlist_created",
  "shared_wishlist_opened",
  "reservation_made",
  "draw_created",
  "participant_links_issued",
  "personal_link_opened",
  "admin_login",
  "email_delivered",
  "email_bounced",
  "email_complained",
  "email_delayed",
  "cta_reveal_to_draw",
  "cta_reveal_to_wishlist",
  "cta_guest_to_draw",
  "cta_guest_to_wishlist",
  "share_link_copied",
] as const;

/** Counters the browser may report itself: plain interface actions, never content or identifiers. */
export const clientUsageEvents = [
  "cta_reveal_to_draw",
  "cta_reveal_to_wishlist",
  "cta_guest_to_draw",
  "cta_guest_to_wishlist",
  "share_link_copied",
] as const satisfies readonly (typeof usageEvents)[number][];

export type ClientUsageEvent = (typeof clientUsageEvents)[number];

export const isClientUsageEvent = (value: unknown): value is ClientUsageEvent =>
  typeof value === "string" && (clientUsageEvents as readonly string[]).includes(value);

export type UsageEvent = (typeof usageEvents)[number];

export type UsageRow = { day: string; event: string; eventCount: number };

export type UsageDay = { day: string; counts: Record<UsageEvent, number> };

const isUsageEvent = (value: string): value is UsageEvent =>
  (usageEvents as readonly string[]).includes(value);

const emptyCounts = (): Record<UsageEvent, number> =>
  Object.fromEntries(usageEvents.map((event) => [event, 0])) as Record<UsageEvent, number>;

/** Calendar day in Europe/Amsterdam as YYYY-MM-DD, matching how the database buckets events. */
export function amsterdamDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** One entry per day, oldest first, with zeros for days without events. */
export function buildUsageSeries(rows: UsageRow[], days: number, now: Date = new Date()): UsageDay[] {
  const byDay = new Map<string, Record<UsageEvent, number>>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    byDay.set(amsterdamDay(new Date(now.getTime() - offset * 86_400_000)), emptyCounts());
  }
  for (const row of rows) {
    const counts = byDay.get(row.day);
    if (counts && isUsageEvent(row.event)) counts[row.event] += row.eventCount;
  }
  return [...byDay.entries()].map(([day, counts]) => ({ day, counts }));
}

export function totalUsage(series: UsageDay[]): Record<UsageEvent, number> {
  const totals = emptyCounts();
  for (const { counts } of series) {
    for (const event of usageEvents) totals[event] += counts[event];
  }
  return totals;
}

/** A calendar-day window from the prior year, used for a like-for-like seasonal comparison. */
export function previousYearWindow(series: UsageDay[], days: number, now: Date = new Date()): UsageDay[] {
  const currentEnd = amsterdamDay(now);
  const currentStart = amsterdamDay(new Date(now.getTime() - (days - 1) * 86_400_000));
  const previousYear = (day: string) => {
    const [year, month, date] = day.split("-").map(Number);
    const candidate = new Date(Date.UTC(year - 1, month - 1, date));
    if (candidate.getUTCMonth() !== month - 1) candidate.setUTCDate(0);
    return candidate.toISOString().slice(0, 10);
  };
  const start = previousYear(currentStart);
  const end = previousYear(currentEnd);
  return series.filter(({ day }) => day >= start && day <= end);
}

export type StockSummary = {
  activeWishlists: number;
  activeDraws: number;
  participants: number;
  reservedWishes: number;
  openPersonalLinks: number;
  oldestWishlistDay?: string;
  oldestDrawDay?: string;
  expiringWithin30Days: number;
};

/** What is stored right now. Counts only: no titles, names, wishes, or links. */
export function summarizeStock(database: Database, now: number = Date.now()): StockSummary {
  const soon = now + 30 * 86_400_000;
  const oldest = (values: string[]) => values.filter(Boolean).sort()[0]?.slice(0, 10);
  const expiring = (times: Array<number | undefined>) =>
    times.filter((time): time is number => time !== undefined && time > now && time <= soon).length;

  return {
    activeWishlists: database.wishlists.length,
    activeDraws: database.draws.length,
    participants: database.draws.reduce((sum, draw) => sum + draw.participants.length, 0),
    reservedWishes: database.wishlists.reduce(
      (sum, wishlist) => sum + wishlist.wishes.filter((wish) => wish.reservation).length,
      0,
    ),
    openPersonalLinks: database.accessTokens.filter(
      (token) => token.role === "draw_participant" && !token.revokedAt && Date.parse(token.expiresAt) > now,
    ).length,
    oldestWishlistDay: oldest(database.wishlists.map((wishlist) => wishlist.createdAt)),
    oldestDrawDay: oldest(database.draws.map((draw) => draw.createdAt)),
    expiringWithin30Days:
      expiring(database.wishlists.map(wishlistExpiresAt)) + expiring(database.draws.map(drawExpiresAt)),
  };
}
