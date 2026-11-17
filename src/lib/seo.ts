import "server-only";

import type { Metadata } from "next";
import { getServerI18n } from "@/i18n/server";
import { getPagePath, getRequestHost, getRequestSiteUrl } from "@/lib/request-site";
import { findSiteDomain } from "@/lib/domains";
import { alternatesFor, pathForLocale, publicPages, type PageKey } from "@/lib/paths";
import type { Locale } from "@/i18n/config";

const openGraphLocales = { nl: "nl_NL", en: "en_GB" } as const;

/**
 * Metadata for a public page. Next.js replaces (not merges) the openGraph object of the layout, so every page
 * has to provide its own complete one; otherwise it would inherit the homepage's social title and description.
 */
/** canonical + hreflang alternates for a public page, as absolute URLs. */
export async function pageAlternates(key: PageKey): Promise<NonNullable<Metadata["alternates"]>> {
  const path = await getPagePath(key);
  const base = await getRequestSiteUrl();
  return {
    canonical: path === "/" ? base : `${base}${path}`,
    languages: Object.fromEntries(alternatesFor(key).map((alternate) => [alternate.hreflang, alternate.url])),
  };
}

/**
 * Language links for the header switcher, keyed by the path on the current domain. Only on the production domains;
 * on previews and local hosts the switcher keeps using the language cookie.
 */
export async function getLanguageLinks(): Promise<Record<string, Record<Locale, string>> | null> {
  if (!findSiteDomain(await getRequestHost())) return null;
  const locale = (await getServerI18n()).locale;
  const links: Record<string, Record<Locale, string>> = {};
  for (const page of publicPages()) {
    const urls = Object.fromEntries(
      alternatesFor(page.key).filter((alternate) => alternate.hreflang !== "x-default").map((alternate) => [alternate.hreflang, alternate.url]),
    ) as Record<Locale, string>;
    links[pathForLocale(page.key, locale)] = urls;
  }
  return links;
}

/** Share image for a page, served by /og in the visitor's language and the active seasonal theme. */
export function socialImages(key: PageKey, alt: string): NonNullable<NonNullable<Metadata["openGraph"]>["images"]> {
  return [{ url: `/og?p=${key}`, width: 1200, height: 630, alt }];
}

export async function publicPageMetadata(
  key: PageKey,
  titleKey: Parameters<Awaited<ReturnType<typeof getServerI18n>>["t"]>[0],
  descriptionKey: Parameters<Awaited<ReturnType<typeof getServerI18n>>["t"]>[0],
): Promise<Metadata> {
  const { locale, t } = await getServerI18n();
  const path = await getPagePath(key);
  const base = await getRequestSiteUrl();
  const title = t(titleKey);
  const description = t(descriptionKey);
  return {
    title,
    description,
    alternates: await pageAlternates(key),
    openGraph: {
      type: "website",
      locale: openGraphLocales[locale],
      siteName: t("app.name"),
      url: path === "/" ? base : `${base}${path}`,
      title,
      description,
      images: socialImages(key, title),
    },
  };
}
