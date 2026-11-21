"use client";

import { useReportWebVitals } from "next/web-vitals";
import { reportUsage } from "@/lib/client";
import { type ClientUsageEvent, webVitalMetrics } from "@/lib/usage";

const ratings = { good: "good", "needs-improvement": "needs_work", poor: "poor" } as const;

// A stable reference keeps Next.js from reporting the same metric twice.
function report(metric: { name: string; rating?: string }) {
  const name = metric.name.toLowerCase();
  if (!(webVitalMetrics as readonly string[]).includes(name)) return;
  const rating = ratings[metric.rating as keyof typeof ratings];
  if (!rating) return;
  // Management pages belong to the owner and stay out of the visitor numbers.
  if (window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) return;
  reportUsage(`vitals_${name}_${rating}` as ClientUsageEvent);
}

/** Counts how many page loads rate good, needs work or poor for LCP, INP and CLS. Sends no values, URLs or identifiers. */
export function WebVitalsMeasurement() {
  useReportWebVitals(report);
  return null;
}
