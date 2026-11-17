import type { MetadataRoute } from "next";
import { privatePathPrefixes } from "@/lib/paths";
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
      disallow: ["/api/", ...privatePathPrefixes()],
    },
    sitemap: `${await getRequestSiteUrl()}/sitemap.xml`,
  };
}
