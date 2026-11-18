import type { Locale } from "@/i18n/config";
import { publicPages, type PageKey } from "@/lib/paths";

export type TrafficRow = {
  day: string;
  site: Locale;
  page: PageKey;
  pageViews: number;
  visits: number;
};

export type TrafficSummaryRow = Omit<TrafficRow, "day">;

export const publicTrafficPageKeys = publicPages().map(({ key }) => key);

const publicTrafficPageKeySet = new Set<string>(publicTrafficPageKeys);
const publicTrafficPaths = new Map(
  publicPages().flatMap((page) =>
    Object.values(page.paths)
      .filter((path): path is string => path !== undefined)
      .map((path) => [path, page.key] as const),
  ),
);

function normalizePathname(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

/** Resolves only explicitly public routes to stable, language-neutral page keys. */
export function publicTrafficPageForPath(pathname: string): PageKey | null {
  return publicTrafficPaths.get(normalizePathname(pathname)) ?? null;
}

export function isPublicTrafficPageKey(value: unknown): value is PageKey {
  return typeof value === "string" && publicTrafficPageKeySet.has(value);
}

/** Keeps only a calendar-day window ending today in Europe/Amsterdam. */
export function trafficWindow(rows: TrafficRow[], days: number, now: Date = new Date()): TrafficRow[] {
  const end = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const startDate = new Date(`${end}T12:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - Math.max(0, days - 1));
  const start = startDate.toISOString().slice(0, 10);
  return rows.filter(({ day }) => day >= start && day <= end);
}

/** Combines daily rows into one row per site and public page. */
export function summarizeTraffic(rows: TrafficRow[]): TrafficSummaryRow[] {
  const totals = new Map<string, TrafficSummaryRow>();
  for (const row of rows) {
    const key = `${row.site}|${row.page}`;
    const current = totals.get(key) ?? { site: row.site, page: row.page, pageViews: 0, visits: 0 };
    current.pageViews += row.pageViews;
    current.visits += row.visits;
    totals.set(key, current);
  }
  return [...totals.values()].sort((left, right) =>
    left.site.localeCompare(right.site) || left.page.localeCompare(right.page),
  );
}
