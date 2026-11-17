import type { MetadataRoute } from "next";
import { localeForHost } from "@/lib/domains";
import { alternatesFor, hasPath, pathForLocale, publicPages } from "@/lib/paths";
import { getRequestHost, getRequestSiteUrl } from "@/lib/request-site";

/** Update when public page content changes; a request-time date would make the field meaningless to crawlers. */
const SITEMAP_LAST_MODIFIED = new Date("2026-11-17");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getRequestSiteUrl();
  const locale = localeForHost(await getRequestHost()) ?? "nl";
  return publicPages().filter((page) => hasPath(page.key, locale)).map((page) => {
    const path = pathForLocale(page.key, locale);
    const isHome = page.key === "home";
    return {
      url: isHome ? base : `${base}${path}`,
      lastModified: SITEMAP_LAST_MODIFIED,
      alternates: {
        languages: Object.fromEntries(alternatesFor(page.key).map((alternate) => [alternate.hreflang, alternate.url])),
      },
    };
  });
}
