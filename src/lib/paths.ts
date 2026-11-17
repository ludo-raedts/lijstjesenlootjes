import type { Locale } from "../i18n/config";
import { SITE_DOMAINS, findSiteDomain, type SiteDomain } from "./domains";

/**
 * Single source of truth for URL paths per domain.
 *
 * Internal route folders (src/app/...) always use the Dutch path ("nl" below). The English domain serves its own
 * paths through host-conditioned rewrites (next.config.ts), so the browser URL stays on the domain's canonical path.
 */
export interface PageDefinition {
  key: PageKey;
  /** Public pages are indexable and listed in the sitemap; private pages hold capability tokens. */
  visibility: "public" | "private";
  /** Path per locale/domain. The Dutch path is also the internal route. */
  paths: Record<Locale, string>;
}

export type PageKey =
  | "home"
  | "wishlistCreate"
  | "drawCreate"
  | "wheel"
  | "help"
  | "privacy"
  | "wishlistManage"
  | "wishlistGuest"
  | "drawAdmin"
  | "drawReveal";

export const PAGES: readonly PageDefinition[] = [
  { key: "home", visibility: "public", paths: { nl: "/", en: "/" } },
  { key: "wishlistCreate", visibility: "public", paths: { nl: "/verlanglijstje-maken", en: "/create-wishlist" } },
  { key: "drawCreate", visibility: "public", paths: { nl: "/lootjes-trekken", en: "/draw-names" } },
  { key: "wheel", visibility: "public", paths: { nl: "/rad-draaien", en: "/spin-the-wheel" } },
  { key: "help", visibility: "public", paths: { nl: "/help", en: "/help" } },
  { key: "privacy", visibility: "public", paths: { nl: "/privacy", en: "/privacy" } },
  { key: "wishlistManage", visibility: "private", paths: { nl: "/verlanglijstje/beheren", en: "/wishlist/manage" } },
  { key: "wishlistGuest", visibility: "private", paths: { nl: "/verlanglijstje/bekijken", en: "/wishlist/view" } },
  { key: "drawAdmin", visibility: "private", paths: { nl: "/trekking-beheren", en: "/draw/manage" } },
  { key: "drawReveal", visibility: "private", paths: { nl: "/lootje", en: "/draw/reveal" } },
];

const DEFAULT_LOCALE: Locale = "nl";

export function getPage(key: PageKey): PageDefinition {
  const page = PAGES.find((candidate) => candidate.key === key);
  if (!page) throw new Error(`Unknown page key: ${key}`);
  return page;
}

/** The internal (Dutch) route folder for a page. */
export function internalPath(key: PageKey): string {
  return getPage(key).paths[DEFAULT_LOCALE];
}

export function pathForLocale(key: PageKey, locale: Locale): string {
  return getPage(key).paths[locale];
}

/** The canonical path on the domain the visitor is on; unknown hosts (previews, local) use the Dutch paths. */
export function pathForHost(key: PageKey, rawHost: string | null | undefined): string {
  return pathForLocale(key, findSiteDomain(rawHost)?.locale ?? DEFAULT_LOCALE);
}

export function publicPages(): PageDefinition[] {
  return PAGES.filter((page) => page.visibility === "public");
}

export function privatePages(): PageDefinition[] {
  return PAGES.filter((page) => page.visibility === "private");
}

/** Private path prefixes in every language, for robots.txt and the proxy. */
export function privatePathPrefixes(): string[] {
  return [...new Set(privatePages().flatMap((page) => Object.values(page.paths)))];
}

export interface Alternate {
  hreflang: string;
  url: string;
}

/** hreflang alternates for a page: every domain with its own path, x-default pointing at the primary domain. */
export function alternatesFor(key: PageKey): Alternate[] {
  const page = getPage(key);
  const urlFor = (domain: SiteDomain) => {
    const path = page.paths[domain.locale];
    return path === "/" ? `https://${domain.host}` : `https://${domain.host}${path}`;
  };
  return [
    ...SITE_DOMAINS.map((domain) => ({ hreflang: domain.locale, url: urlFor(domain) })),
    { hreflang: "x-default", url: urlFor(SITE_DOMAINS[0]) },
  ];
}

export function linkHeaderValue(key: PageKey): string {
  return alternatesFor(key)
    .map((alternate) => `<${alternate.url}>; rel="alternate"; hreflang="${alternate.hreflang}"`)
    .join(", ");
}

export interface PathRule {
  host: string;
  source: string;
  destination: string;
}

/** On every domain, other languages' paths permanently redirect (308) to that domain's canonical path. */
export function redirectRules(): PathRule[] {
  return SITE_DOMAINS.flatMap((domain) =>
    PAGES.flatMap((page) => {
      const canonical = page.paths[domain.locale];
      return Object.values(page.paths)
        .filter((path) => path !== canonical)
        .map((path) => ({ host: domain.host, source: path, destination: canonical }));
    }),
  );
}

/** Domains whose canonical paths differ from the internal route folders serve them through rewrites. */
export function rewriteRules(): PathRule[] {
  return SITE_DOMAINS.flatMap((domain) =>
    PAGES.filter((page) => page.paths[domain.locale] !== internalPath(page.key)).map((page) => ({
      host: domain.host,
      source: page.paths[domain.locale],
      destination: internalPath(page.key),
    })),
  );
}
