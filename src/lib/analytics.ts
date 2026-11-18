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

export type TrafficAdjustment = {
  page: PageKey;
  pageViews: number;
  visits: number;
};

export type CountryTrafficRow = {
  day: string;
  site: Locale;
  country: string;
  pageViews: number;
  visits: number;
};

export type CountryTrafficSummaryRow = Omit<CountryTrafficRow, "day">;
export const OTHER_COUNTRIES = "OTHER";

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

/** Vercel supplies an ISO 3166-1 alpha-2 country code; missing or malformed values stay unknown. */
export function normalizeTrafficCountry(value: unknown) {
  if (typeof value !== "string") return "ZZ";
  const country = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : "ZZ";
}

/** Keeps only a calendar-day window ending today in Europe/Amsterdam. */
export function trafficWindow<T extends { day: string }>(rows: T[], days: number, now: Date = new Date()): T[] {
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

/** Shows countries only after five visits; smaller and unknown groups are combined per site. */
export function summarizeCountryTraffic(
  rows: CountryTrafficRow[],
  minimumVisits = 5,
): CountryTrafficSummaryRow[] {
  const countries = new Map<string, CountryTrafficSummaryRow>();
  for (const row of rows) {
    const key = `${row.site}|${row.country}`;
    const current = countries.get(key) ?? {
      site: row.site,
      country: row.country,
      pageViews: 0,
      visits: 0,
    };
    current.pageViews += row.pageViews;
    current.visits += row.visits;
    countries.set(key, current);
  }

  const visible: CountryTrafficSummaryRow[] = [];
  const other = new Map<Locale, CountryTrafficSummaryRow>();
  for (const row of countries.values()) {
    if (row.country !== "ZZ" && row.visits >= minimumVisits) {
      visible.push(row);
      continue;
    }
    const current = other.get(row.site) ?? {
      site: row.site,
      country: OTHER_COUNTRIES,
      pageViews: 0,
      visits: 0,
    };
    current.pageViews += row.pageViews;
    current.visits += row.visits;
    other.set(row.site, current);
  }

  return [...visible, ...other.values()].sort((left, right) =>
    left.site.localeCompare(right.site) || right.visits - left.visits || left.country.localeCompare(right.country),
  );
}
