import "server-only";

import { findSiteDomain } from "@/lib/domains";
import { getRequestHost } from "@/lib/request-site";
import type { Locale } from "@/i18n/config";
import { resolveAmazonLink, type AmazonLinkConfig } from "@/lib/affiliate/amazon";

/** Resolves the Amazon link configuration for the current request, or null when not applicable. */
export async function getAmazonLinkConfig(locale: Locale): Promise<AmazonLinkConfig | null> {
  const domain = findSiteDomain(await getRequestHost());
  return resolveAmazonLink(domain?.host, locale, {
    AMAZON_AFFILIATE_DISABLED: process.env.AMAZON_AFFILIATE_DISABLED,
    AMAZON_ASSOCIATE_TAG_US: process.env.AMAZON_ASSOCIATE_TAG_US,
  });
}
