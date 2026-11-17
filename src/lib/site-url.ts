const LOCAL_URL = "http://localhost:3000";

function normalizeUrl(value: string): string {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/$/, "");
}

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return normalizeUrl(configuredUrl);

  const vercelHost = process.env.VERCEL_ENV === "production"
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
    : process.env.VERCEL_URL;

  return vercelHost ? normalizeUrl(vercelHost) : LOCAL_URL;
}

export function isVercelPreview(): boolean {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "production";
}
