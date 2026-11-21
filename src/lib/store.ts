import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { commitBackoffMs } from "@/lib/backoff";
import { purgeDeletedWishlists } from "@/lib/data-lifecycle";
import type { CountryTrafficRow, TrafficAdjustment, TrafficRow } from "@/lib/analytics";
import type { Locale } from "@/i18n/config";
import type { PageKey } from "@/lib/paths";
import type { UsageEvent, UsageRow } from "@/lib/usage";
import type { Database } from "@/lib/types";

const MAX_COMMIT_ATTEMPTS = 12;
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("The server is missing the Supabase URL or secret server key.");
  }

  client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return client;
}

async function readSnapshot(): Promise<{ version: number; database: Database }> {
  const { data, error } = await getClient().rpc("read_app_state");
  if (error) {
    console.error("Supabase read_app_state failed", error.code, error.message);
    throw new Error("The database could not be read.");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || !("version" in row) || !("data" in row)) {
    throw new Error("The database does not contain valid application state.");
  }

  return {
    version: Number(row.version),
    database: row.data as Database,
  };
}

export async function read<T>(reader: (database: Database) => T | Promise<T>) {
  const { database } = await readSnapshot();
  return reader(database);
}

export async function transaction<T>(
  mutation: (database: Database) => T | Promise<T>,
) {
  for (let attempt = 0; attempt < MAX_COMMIT_ATTEMPTS; attempt += 1) {
    const { version, database } = await readSnapshot();
    const result = await mutation(database);
    purgeDeletedWishlists(database);
    const { data: committed, error } = await getClient().rpc("commit_app_state", {
      p_expected_version: version,
      p_next_data: database,
    });

    if (error) {
      console.error("Supabase commit_app_state failed", error.code, error.message);
      throw new Error("The database change could not be stored.");
    }
    if (committed === true) return result;
    // Someone else committed first. Count the collision (no data) and retry after a random pause.
    console.warn("Supabase state commit conflict", attempt + 1);
    void recordUsage("state_commit_conflict");
    await new Promise((resolve) => setTimeout(resolve, commitBackoffMs(attempt)));
  }

  await recordUsage("state_commit_failed");
  throw new Error("The database was too busy to commit the change.");
}

export async function consumeRateLimit(
  bucketKey: string,
  maximum: number,
  windowSeconds: number,
) {
  const { data, error } = await getClient().rpc("consume_app_rate_limit", {
    p_bucket_key: bucketKey,
    p_maximum: maximum,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Supabase consume_app_rate_limit failed", error.code, error.message);
    throw new Error("The rate limit could not be checked.");
  }
  if (typeof data !== "boolean") {
    throw new Error("The database returned an invalid rate-limit result.");
  }
  return data;
}

export async function checkDatabaseHealth() {
  const { data, error } = await getClient().rpc("app_health");
  if (error) {
    console.error("Supabase app_health failed", error.code);
    return false;
  }
  return data === true;
}

/** Best-effort anonymous counter. A failure here must never break the user's action. */
export async function recordUsage(event: UsageEvent, amount = 1) {
  // Only real production traffic counts: local dev servers and preview deployments must not skew the figures.
  if (process.env.VERCEL_ENV !== "production") return;
  try {
    const parameters = amount === 1 ? { p_event: event } : { p_event: event, p_amount: amount };
    const { error } = await getClient().rpc("record_usage_event", parameters);
    if (error) console.error("Supabase record_usage_event failed", error.code);
  } catch {
    console.error("Supabase record_usage_event failed");
  }
}

export async function readUsageDaily(days: number): Promise<UsageRow[]> {
  const { data, error } = await getClient().rpc("read_usage_daily", { p_days: days });
  if (error) {
    console.error("Supabase read_usage_daily failed", error.code);
    throw new Error("Usage could not be read.");
  }
  return (Array.isArray(data) ? data : []).map((row: { day: string; event: string; event_count: number }) => ({
    day: row.day,
    event: row.event,
    eventCount: Number(row.event_count),
  }));
}

export async function recordTrafficMeasurement(site: Locale, page: PageKey, visit: boolean, country: string) {
  const { error } = await getClient().rpc("record_traffic_measurement_with_country", {
    p_site: site,
    p_page: page,
    p_visit: visit,
    p_country: country,
  });
  if (error) {
    console.error("Supabase record_traffic_measurement_with_country failed", error.code);
    throw new Error("Traffic measurement could not be recorded.");
  }
}

export async function readTrafficDaily(days: number): Promise<TrafficRow[]> {
  const { data, error } = await getClient().rpc("read_traffic_daily", { p_days: days });
  if (error) {
    console.error("Supabase read_traffic_daily failed", error.code);
    throw new Error("Traffic measurements could not be read.");
  }
  return (Array.isArray(data) ? data : []).map((row: {
    day: string;
    site: Locale;
    page: PageKey;
    page_view_count: number;
    visit_count: number;
  }) => ({
    day: row.day,
    site: row.site,
    page: row.page,
    pageViews: Number(row.page_view_count),
    visits: Number(row.visit_count),
  }));
}

export async function readCountryTrafficDaily(days: number): Promise<CountryTrafficRow[]> {
  const { data, error } = await getClient().rpc("read_country_traffic_daily", { p_days: days });
  if (error) {
    console.error("Supabase read_country_traffic_daily failed", error.code);
    throw new Error("Country traffic measurements could not be read.");
  }
  return (Array.isArray(data) ? data : []).map((row: {
    day: string;
    site: Locale;
    country: string;
    page_view_count: number;
    visit_count: number;
  }) => ({
    day: row.day,
    site: row.site,
    country: row.country,
    pageViews: Number(row.page_view_count),
    visits: Number(row.visit_count),
  }));
}

export async function excludeTrafficMeasurement(
  site: Locale,
  measurements: TrafficAdjustment[],
  country: string,
) {
  const { error } = await getClient().rpc("exclude_traffic_measurement", {
    p_site: site,
    p_measurements: measurements.map(({ page, pageViews, visits }) => ({
      page,
      page_views: pageViews,
      visits,
    })),
    p_country: country,
  });
  if (error) {
    console.error("Supabase exclude_traffic_measurement failed", error.code);
    throw new Error("Administrator traffic could not be excluded.");
  }
}

export async function cleanupMeasurementRetention() {
  const { error } = await getClient().rpc("cleanup_usage_measurement");
  if (error) {
    console.error("Supabase cleanup_usage_measurement failed", error.code);
    throw new Error("Measurement retention cleanup failed.");
  }
}
