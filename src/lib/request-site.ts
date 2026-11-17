import "server-only";

import { headers } from "next/headers";
import { originForHost } from "@/lib/domains";
import { pathForHost, type PageKey } from "@/lib/paths";
import { getSiteUrl } from "@/lib/site-url";

export async function getRequestHost(): Promise<string | null> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
}

/** Public origin of the domain the visitor is on; falls back to the configured site URL (previews, local). */
export async function getRequestSiteUrl(): Promise<string> {
  return originForHost(await getRequestHost()) ?? getSiteUrl();
}

/** Resolves the canonical path of a page on the domain the visitor is on (the path follows the domain, not the cookie). */
export async function getPagePath(key: PageKey): Promise<string> {
  return pathForHost(key, await getRequestHost());
}
