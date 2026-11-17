import type { MetadataRoute } from "next";
import { getSiteUrl, isVercelPreview } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  if (isVercelPreview()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/verlanglijstje/beheren", "/verlanglijstje/bekijken", "/trekking-beheren", "/lootje"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
