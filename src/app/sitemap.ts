import type { MetadataRoute } from "next";
import { localeForHost } from "@/lib/domains";
import { alternatesFor, pathForLocale, publicPages } from "@/lib/paths";
import { getRequestHost, getRequestSiteUrl } from "@/lib/request-site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getRequestSiteUrl();
  const locale = localeForHost(await getRequestHost()) ?? "nl";
  return publicPages().map((page) => {
    const path = pathForLocale(page.key, locale);
    const isHome = page.key === "home";
    return {
      url: isHome ? base : `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: isHome ? "weekly" : "monthly",
      priority: isHome ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(alternatesFor(page.key).map((alternate) => [alternate.hreflang, alternate.url])),
      },
    };
  });
}
