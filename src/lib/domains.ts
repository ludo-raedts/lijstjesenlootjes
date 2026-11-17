import type { Locale } from "../i18n/config";

export interface SiteDomain {
  host: string;
  locale: Locale;
}

/** Public domains served by this app. The first entry is the primary (x-default) domain. */
export const SITE_DOMAINS: readonly SiteDomain[] = [
  { host: "lijstjesenlootjes.nl", locale: "nl" },
  { host: "wishanddraw.com", locale: "en" },
];

/** Public pages that have an equivalent on every domain (used for hreflang). */
export const PUBLIC_PATHS = ["/", "/verlanglijstje-maken", "/lootjes-trekken", "/rad-draaien", "/help", "/privacy"] as const;

function stripHost(rawHost: string | null | undefined): string | null {
  const host = rawHost?.split(",")[0]?.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  return host ? host : null;
}

export function findSiteDomain(rawHost: string | null | undefined): SiteDomain | null {
  const host = stripHost(rawHost)?.replace(/^www\./, "");
  return SITE_DOMAINS.find((domain) => domain.host === host) ?? null;
}

export function localeForHost(rawHost: string | null | undefined): Locale | null {
  return findSiteDomain(rawHost)?.locale ?? null;
}

export function originForHost(rawHost: string | null | undefined): string | null {
  const domain = findSiteDomain(rawHost);
  return domain ? `https://${domain.host}` : null;
}
