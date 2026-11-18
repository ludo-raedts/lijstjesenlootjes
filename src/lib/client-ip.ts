/**
 * The address rate limits are counted against. The leftmost entry of x-forwarded-for is whatever the caller sent
 * and can be spoofed to dodge a limit, so it is the last choice. The platform's own headers come first
 * (Vercel sets x-vercel-forwarded-for and overwrites x-real-ip); for a plain proxy chain the rightmost entry is
 * the one the nearest proxy added.
 */
export function clientIdentifier(headers: Pick<Headers, "get">): string {
  const platform = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (platform) return platform;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const chain = headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return chain?.at(-1) ?? "local";
}
