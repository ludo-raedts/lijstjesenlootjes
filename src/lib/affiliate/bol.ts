import type { Locale } from "../../i18n/config";

/**
 * A bol Affiliate Programme registration bound to one public domain.
 * The site code is public (it appears in every outbound link), not a secret.
 * Catalog API credentials are a different thing and must never live in this file.
 */
export interface BolProgram {
  /** Public site host this programme is registered for. */
  siteHost: string;
  /** Interface locales in which the commercial link is shown. bol terms limit use to NL/BE. */
  locales: readonly Locale[];
  /** Site code from the bol partner dashboard. */
  siteId: string;
}

/** What the browser needs to build an outbound bol link. */
export type BolLinkConfig = Pick<BolProgram, "siteId">;

export const BOL_PROGRAMS: readonly BolProgram[] = [
  { siteHost: "lijstjesenlootjes.nl", locales: ["nl"], siteId: "1560649" },
];

const MAX_QUERY_LENGTH = 120;
const SITE_ID_PATTERN = /^\d{4,12}$/;
const CLICK_ENDPOINT = "https://partner.bol.com/click/click";
const CAMPAIGN_NAME = "lijstjesenlootjes";
const BOL_HOSTS = new Set(["www.bol.com", "bol.com"]);

export interface BolEnvironment {
  /** Kill switch: any non-empty value other than "0"/"false" disables all bol links. */
  BOL_AFFILIATE_DISABLED?: string;
  /** Optional per-environment site code override. */
  BOL_AFFILIATE_SITE_ID?: string;
}

function isDisabled(env: BolEnvironment): boolean {
  const value = env.BOL_AFFILIATE_DISABLED?.trim().toLowerCase();
  return Boolean(value) && value !== "0" && value !== "false";
}

/**
 * Returns the link configuration for this site host and interface locale, or null when
 * affiliate links must not be shown (unknown host, unsupported locale, kill switch, bad id).
 * `siteHost` is expected to be normalised by `findSiteDomain` in `domains.ts`.
 */
export function resolveBolLink(
  siteHost: string | null | undefined,
  locale: Locale,
  env: BolEnvironment = {},
): BolLinkConfig | null {
  if (isDisabled(env) || !siteHost) return null;
  const program = BOL_PROGRAMS.find((entry) => entry.siteHost === siteHost);
  if (!program || !program.locales.includes(locale)) return null;
  const siteId = env.BOL_AFFILIATE_SITE_ID?.trim() || program.siteId;
  if (!SITE_ID_PATTERN.test(siteId)) return null;
  return { siteId };
}

function buildClickUrl(target: string, config: BolLinkConfig): string {
  const url = new URL(CLICK_ENDPOINT);
  url.searchParams.set("p", "2");
  url.searchParams.set("t", "url");
  url.searchParams.set("s", config.siteId);
  url.searchParams.set("url", target);
  url.searchParams.set("f", "TXL");
  url.searchParams.set("name", CAMPAIGN_NAME);
  return url.toString();
}

/**
 * Display-time deeplink for a bol.com product or search URL the user entered. The stored
 * URL is never changed. Only https/http links on bol.com itself are wrapped; anything
 * else (other shops, the partner click host, short links) returns null (leave untouched).
 */
export function wrapBolUrl(rawUrl: string, config: BolLinkConfig): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!BOL_HOSTS.has(url.hostname)) return null;
  url.protocol = "https:";
  return buildClickUrl(url.toString(), config);
}

/**
 * Builds a deliberate bol search deeplink. User-entered wish URLs are never rewritten;
 * this link is only offered as a separate action and carries only the wish title.
 */
export function buildBolSearchUrl(query: string, config: BolLinkConfig): string | null {
  const keywords = query.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH).trim();
  if (!keywords) return null;
  const target = new URL("https://www.bol.com/nl/nl/s/");
  target.searchParams.set("searchtext", keywords);
  return buildClickUrl(target.toString(), config);
}
