import type { MetadataRoute } from "next";
import { getRequestSiteUrl } from "@/lib/request-site";
import { isVercelPreview } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (isVercelPreview()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/verlanglijstje/beheren", "/verlanglijstje/bekijken", "/trekking-beheren", "/lootje"],
    },
    sitemap: `${await getRequestSiteUrl()}/sitemap.xml`,
  };
}
