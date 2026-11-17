import type { NextConfig } from "next";
import { PUBLIC_PATHS, SITE_DOMAINS } from "./src/lib/domains";

const escapeHost = (host: string) => host.replace(/\./g, "\\.");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // One canonical host per domain: www -> apex (permanent). The URL stays on the visitor's own domain.
    return SITE_DOMAINS.map((domain) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: `www.${domain.host}` }],
      destination: `https://${domain.host}/:path*`,
      permanent: true,
    }));
  },
  async headers() {
    // hreflang alternates for every public page, announced on each domain.
    return SITE_DOMAINS.flatMap((domain) =>
      PUBLIC_PATHS.map((path) => ({
        source: path,
        has: [{ type: "host" as const, value: escapeHost(domain.host) }],
        headers: [
          {
            key: "Link",
            value: [
              ...SITE_DOMAINS.map((alternate) => `<https://${alternate.host}${path}>; rel="alternate"; hreflang="${alternate.locale}"`),
              `<https://${SITE_DOMAINS[0].host}${path}>; rel="alternate"; hreflang="x-default"`,
            ].join(", "),
          },
        ],
      })),
    );
  },
};

export default nextConfig;
