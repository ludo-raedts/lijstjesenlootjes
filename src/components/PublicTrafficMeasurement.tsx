"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { publicTrafficPageForPath } from "@/lib/analytics";

const VISIT_DAY_KEY = "ll_public_visit_day";
let fallbackVisitDay: string | undefined;

function amsterdamDay() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Claims one anonymous visit per browser tab and Amsterdam calendar day without creating an identifier. */
function claimVisit() {
  const today = amsterdamDay();
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

/** Sends only a stable public-page key and a visit boolean to the app's own API. */
export function PublicTrafficMeasurement() {
  const pathname = usePathname();
  const page = publicTrafficPageForPath(pathname);
  const lastMeasuredPage = useRef<string | null>(null);

  useEffect(() => {
    if (!page || lastMeasuredPage.current === page) return;
    lastMeasuredPage.current = page;
    void fetch("/api/traffic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page, visit: claimVisit() }),
      keepalive: true,
      referrerPolicy: "no-referrer",
    }).catch(() => undefined);
  }, [page]);

  return null;
}
