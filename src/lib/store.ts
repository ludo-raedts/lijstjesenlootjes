import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { purgeDeletedWishlists } from "@/lib/data-lifecycle";
import type { Database } from "@/lib/types";

const MAX_COMMIT_ATTEMPTS = 8;
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
  }

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
