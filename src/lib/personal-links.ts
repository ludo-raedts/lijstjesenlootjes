import { pathForHost, type PageKey } from "./paths";

/** Absolute personal link for the domain the request arrived on; the raw token stays in the URL fragment. */
export function personalLink(request: Request, key: PageKey, token: string): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${url.origin}${pathForHost(key, host)}#token=${token}`;
}
