"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isPublicTrafficPageKey, publicTrafficPageForPath, type TrafficAdjustment } from "@/lib/analytics";
import type { PageKey } from "@/lib/paths";

const VISIT_DAY_KEY = "ll_public_visit_day";
const TRAFFIC_LEDGER_KEY = "ll_public_traffic_ledger";
const EXCLUDED_DAY_KEY = "ll_public_traffic_excluded_day";
let fallbackVisitDay: string | undefined;
let fallbackExcludedDay: string | undefined;
let fallbackLedger: TrafficLedger | undefined;

type TrafficLedger = { day: string; measurements: TrafficAdjustment[] };

function amsterdamDay() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Claims one anonymous visit per browser tab and Amsterdam calendar day without creating an identifier. */
function claimVisit(today: string) {
  try {
    if (sessionStorage.getItem(VISIT_DAY_KEY) === today) return false;
    sessionStorage.setItem(VISIT_DAY_KEY, today);
    return true;
  } catch {
    if (fallbackVisitDay === today) return false;
    fallbackVisitDay = today;
    return true;
  }
}

function readLedger(today: string): TrafficLedger {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(TRAFFIC_LEDGER_KEY) ?? "null") as Partial<TrafficLedger> | null;
    if (parsed?.day !== today || !Array.isArray(parsed.measurements)) return { day: today, measurements: [] };
    const measurements = parsed.measurements.filter((measurement): measurement is TrafficAdjustment =>
      isPublicTrafficPageKey(measurement?.page) &&
      Number.isInteger(measurement?.pageViews) && measurement.pageViews > 0 &&
      Number.isInteger(measurement?.visits) && measurement.visits >= 0 && measurement.visits <= measurement.pageViews,
    );
    return { day: today, measurements };
  } catch {
    return fallbackLedger?.day === today ? fallbackLedger : { day: today, measurements: [] };
  }
}

function writeLedger(ledger: TrafficLedger) {
  fallbackLedger = ledger;
  try {
    sessionStorage.setItem(TRAFFIC_LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    // The in-memory fallback still excludes same-page-session administrator traffic.
  }
}

function rememberMeasurement(today: string, page: PageKey, visit: boolean) {
  const ledger = readLedger(today);
  const current = ledger.measurements.find((measurement) => measurement.page === page);
  if (current) {
    current.pageViews += 1;
    current.visits += visit ? 1 : 0;
  } else {
    ledger.measurements.push({ page, pageViews: 1, visits: visit ? 1 : 0 });
  }
  writeLedger(ledger);
}

function isExcluded(today: string) {
  try {
    return sessionStorage.getItem(EXCLUDED_DAY_KEY) === today;
  } catch {
    return fallbackExcludedDay === today;
  }
}

function excludeToday(today: string) {
  const measurements = readLedger(today).measurements;
  fallbackExcludedDay = today;
  fallbackLedger = { day: today, measurements: [] };
  try {
    sessionStorage.setItem(EXCLUDED_DAY_KEY, today);
    sessionStorage.removeItem(TRAFFIC_LEDGER_KEY);
  } catch {
    // The in-memory fallback is enough for this page session.
  }
  return measurements;
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Sends only a stable public-page key and a visit boolean to the app's own API. */
export function PublicTrafficMeasurement() {
  const pathname = usePathname();
  const page = publicTrafficPageForPath(pathname);
  const lastMeasuredPage = useRef<string | null>(null);

  useEffect(() => {
    const today = amsterdamDay();
    if (isAdminPath(pathname)) {
      lastMeasuredPage.current = null;
      const measurements = excludeToday(today);
      if (measurements.length > 0) {
        void fetch("/api/traffic/exclude", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ measurements }),
          keepalive: true,
          referrerPolicy: "no-referrer",
        }).catch(() => undefined);
      }
      return;
    }
    if (!page || isExcluded(today) || lastMeasuredPage.current === page) return;
    lastMeasuredPage.current = page;
    const visit = claimVisit(today);
    rememberMeasurement(today, page, visit);
    void fetch("/api/traffic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page, visit }),
      keepalive: true,
      referrerPolicy: "no-referrer",
    }).catch(() => undefined);
  }, [page, pathname]);

  return null;
}
