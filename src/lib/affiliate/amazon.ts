import type { Locale } from "../../i18n/config";

/**
 * An Amazon Associates programme bound to one public domain and marketplace.
 * The Associates tag is public (it appears in every outbound link), not a secret.
 */
export interface AmazonProgram {
  /** Public site host this programme is registered for. */
  siteHost: string;
  /** Interface locales in which the commercial link is shown. */
  locales: readonly Locale[];
  /** Amazon marketplace host receiving the traffic. */
  marketplaceHost: string;
  /** Associates tag registered for this marketplace. */
  tag: string;
}

/** What the browser needs to build an outbound search link. */
export type AmazonLinkConfig = Pick<AmazonProgram, "marketplaceHost" | "tag">;

/**
 * Registered programmes. A tag only works on the marketplace it was registered for:
 * "-20" tags belong to amazon.com. Add an amazon.nl entry only after a PartnerNet NL
 * account exists and returns its own "-21" tag.
 */
export const AMAZON_PROGRAMS: readonly AmazonProgram[] = [
  {
    siteHost: "wishanddraw.com",
    locales: ["en"],
    marketplaceHost: "www.amazon.com",
    tag: "wishanddraw-20",
  },
];

const MAX_QUERY_LENGTH = 120;
const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{1,40}-\d{2}$/i;

export interface AmazonEnvironment {
  /** Kill switch: any non-empty value other than "0"/"false" disables all Amazon links. */
  AMAZON_AFFILIATE_DISABLED?: string;
  /** Optional per-environment tag override for the first (amazon.com) programme. */
  AMAZON_ASSOCIATE_TAG_US?: string;
}

function isDisabled(env: AmazonEnvironment): boolean {
  const value = env.AMAZON_AFFILIATE_DISABLED?.trim().toLowerCase();
  return Boolean(value) && value !== "0" && value !== "false";
}

/**
 * Returns the link configuration for this site host and interface locale, or null when
 * affiliate links must not be shown (unknown host, unsupported locale, kill switch, bad tag).
 * `siteHost` is expected to be normalised by `findSiteDomain` in `domains.ts`.
 */
export function resolveAmazonLink(
  siteHost: string | null | undefined,
  locale: Locale,
  env: AmazonEnvironment = {},
): AmazonLinkConfig | null {
  if (isDisabled(env) || !siteHost) return null;
  const program = AMAZON_PROGRAMS.find((entry) => entry.siteHost === siteHost);
  if (!program || !program.locales.includes(locale)) return null;
  const override = program.marketplaceHost === "www.amazon.com" ? env.AMAZON_ASSOCIATE_TAG_US?.trim() : undefined;
  const tag = override || program.tag;
  if (!TAG_PATTERN.test(tag)) return null;
  return { marketplaceHost: program.marketplaceHost, tag };
}

/**
 * Display-time tagging of a link the user entered. The stored URL is never changed.
 * Only full URLs on the programme's own marketplace are tagged: other hosts, short links
 * (amzn.to, a.co) and other Amazon marketplaces are returned as null (leave untouched),
 * because a tag only earns commission on the marketplace it was registered for. Any tag
 * already present is replaced with ours.
 */
export function tagAmazonUrl(rawUrl: string, config: AmazonLinkConfig): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const bareHost = config.marketplaceHost.replace(/^www\./, "");
  if (url.hostname !== config.marketplaceHost && url.hostname !== bareHost) return null;
  url.protocol = "https:";
  url.searchParams.set("tag", config.tag);
  return url.toString();
}

/**
 * Builds a deliberate Amazon search link carrying the Associates tag. User-entered wish
 * URLs are never rewritten; this link is only offered as a separate action.
 */
export function buildAmazonSearchUrl(query: string, config: AmazonLinkConfig): string | null {
  const keywords = query.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH).trim();
  if (!keywords) return null;
  const url = new URL(`https://${config.marketplaceHost}/s`);
  url.searchParams.set("k", keywords);
  url.searchParams.set("tag", config.tag);
  return url.toString();
}
