import type { NextConfig } from "next";
import { SITE_DOMAINS } from "./src/lib/domains";
import { PAGES, linkHeaderValue, redirectRules, rewriteRules } from "./src/lib/paths";

const escapeHost = (host: string) => host.replace(/\./g, "\\.");
const hostCondition = (host: string) => ({ type: "host" as const, value: escapeHost(host) });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: { "/og": ["./src/assets/fonts/*.woff"] },
  async redirects() {
    return [
      // One canonical host per domain: www -> apex (permanent). The URL stays on the visitor's own domain.
      ...SITE_DOMAINS.map((domain) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: `www.${domain.host}` }],
        destination: `https://${domain.host}/:path*`,
        permanent: true,
      })),
      // One canonical path per page per domain (308). Fragments (#token=...) survive redirects in browsers.
      ...redirectRules().map((rule) => ({
        source: rule.source,
        has: [hostCondition(rule.host)],
        destination: rule.destination,
        permanent: true,
      })),
    ];
  },
  async rewrites() {
    // Serve the domain's own paths from the internal (Dutch) route folders; the browser URL does not change.
    return {
      beforeFiles: rewriteRules().map((rule) => ({
        source: rule.source,
        has: [hostCondition(rule.host)],
        destination: rule.destination,
      })),
    };
  },
  async headers() {
    // hreflang alternates for every public page, announced on each domain under that domain's own path.
    return SITE_DOMAINS.flatMap((domain) =>
      PAGES.filter((page) => page.visibility === "public").map((page) => ({
        source: page.paths[domain.locale],
        has: [hostCondition(domain.host)],
        headers: [{ key: "Link", value: linkHeaderValue(page.key) }],
      })),
    );
  },
};

export default nextConfig;
