import type { MetadataRoute } from "next";
import { PUBLIC_PATHS } from "@/lib/domains";
import { getRequestSiteUrl } from "@/lib/request-site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getRequestSiteUrl();
  return PUBLIC_PATHS.map((route) => ({
    url: route === "/" ? base : `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
