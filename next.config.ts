import type { NextConfig } from "next";

const PRIMARY_HOST = "lijstjesenlootjes.nl";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      // One canonical host: www -> apex (permanent).
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${PRIMARY_HOST}` }],
        destination: `https://${PRIMARY_HOST}/:path*`,
        permanent: true,
      },
      // Reserved international domain: temporary until an English site exists.
      {
        source: "/:path*",
        has: [{ type: "host", value: "(www\\.)?wishanddraw\\.com" }],
        destination: `https://${PRIMARY_HOST}/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
