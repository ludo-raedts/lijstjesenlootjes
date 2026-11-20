import { siteLocaleFor, type Locale, type SiteLocale } from "../i18n/config";
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
  /**
   * Path per locale/domain. The Dutch path is also the internal route and always exists. A page without a path
   * for a locale does not exist on that locale's domain (no sitemap entry, no hreflang alternate).
   */
  paths: { nl: string; en?: string };
  /** Required when a locale has no path: where links to this page and its Dutch path lead on that domain. */
  fallback?: PageKey;
  /** Former paths per locale that permanently redirect (308) to the canonical path on that locale's domain. */
  legacyPaths?: Partial<Record<SiteLocale, readonly string[]>>;
}

export type PageKey =
  | "home"
  | "wishlistCreate"
  | "drawCreate"
  | "wheel"
  | "drawTogether"
  | "sinterklaasDraw"
  | "officeDraw"
  | "christmasDraw"
  | "birthdayWishlist"
  | "help"
  | "privacy"
  | "wishlistManage"
  | "wishlistGuest"
  | "drawAdmin"
  | "drawReveal"
  | "recover";

export const PAGES: readonly PageDefinition[] = [
  { key: "home", visibility: "public", paths: { nl: "/", en: "/" } },
  { key: "wishlistCreate", visibility: "public", paths: { nl: "/verlanglijstje-maken", en: "/wishlist-maker" }, legacyPaths: { en: ["/create-wishlist"] } },
  { key: "drawCreate", visibility: "public", paths: { nl: "/lootjes-trekken", en: "/secret-santa-generator" }, legacyPaths: { en: ["/draw-names"] } },
  { key: "wheel", visibility: "public", paths: { nl: "/rad-draaien", en: "/name-wheel" }, legacyPaths: { en: ["/spin-the-wheel"] } },
  { key: "drawTogether", visibility: "public", paths: { nl: "/samen-lootjes-trekken", en: "/draw-names-together" } },
  { key: "sinterklaasDraw", visibility: "public", paths: { nl: "/sinterklaas-lootjes-trekken" }, fallback: "drawCreate" },
  { key: "officeDraw", visibility: "public", paths: { nl: "/lootjes-trekken-op-kantoor", en: "/office-secret-santa" } },
  { key: "christmasDraw", visibility: "public", paths: { nl: "/kerst-lootjes-trekken" }, fallback: "drawCreate" },
  { key: "birthdayWishlist", visibility: "public", paths: { nl: "/verlanglijstje-voor-verjaardag", en: "/birthday-wishlist" } },
  { key: "help", visibility: "public", paths: { nl: "/help", en: "/help" } },
  { key: "privacy", visibility: "public", paths: { nl: "/privacy", en: "/privacy" } },
  { key: "wishlistManage", visibility: "private", paths: { nl: "/verlanglijstje/beheren", en: "/wishlist/manage" } },
  { key: "wishlistGuest", visibility: "private", paths: { nl: "/verlanglijstje/bekijken", en: "/wishlist/view" } },
  { key: "drawAdmin", visibility: "private", paths: { nl: "/trekking-beheren", en: "/draw/manage" } },
  { key: "drawReveal", visibility: "private", paths: { nl: "/lootje", en: "/draw/reveal" } },
  // Not secret, but not for search engines or the sitemap either: a form for people who lost their management link.
  { key: "recover", visibility: "private", paths: { nl: "/beheerlink-kwijt", en: "/recover-link" } },
];

const DEFAULT_LOCALE: SiteLocale = "nl";

export function getPage(key: PageKey): PageDefinition {
  const page = PAGES.find((candidate) => candidate.key === key);
  if (!page) throw new Error(`Unknown page key: ${key}`);
  return page;
}

/** The internal (Dutch) route folder for a page. */
export function internalPath(key: PageKey): string {
  return getPage(key).paths.nl;
}

/** Whether the page exists on the locale's domain. */
export function hasPath(key: PageKey, locale: Locale): boolean {
  return getPage(key).paths[siteLocaleFor(locale)] !== undefined;
}

/** The page's path on the locale's domain; for a page that domain lacks, the path of its fallback page. */
export function pathForLocale(key: PageKey, locale: Locale): string {
  const page = getPage(key);
  const path = page.paths[siteLocaleFor(locale)];
  if (path !== undefined) return path;
  if (!page.fallback) throw new Error(`Page ${key} has no ${locale} path and no fallback`);
  return pathForLocale(page.fallback, locale);
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
  return [...new Set(privatePages().flatMap((page) => Object.values(page.paths).filter((path): path is string => path !== undefined)))];
}

/**
 * robots.txt rules for private paths. A bare "Disallow: /lootje" is a prefix match and would also block the public
 * "/lootjes-trekken"; so each private path is blocked as an exact path plus its sub-paths.
 */
export function privateDisallowRules(): string[] {
  return privatePathPrefixes().flatMap((path) => [`${path}$`, `${path}/`]);
}

export interface Alternate {
  hreflang: string;
  url: string;
}

/** hreflang alternates for a page: every domain with its own path, x-default pointing at the primary domain. */
export function alternatesFor(key: PageKey): Alternate[] {
  const page = getPage(key);
  const urlFor = (domain: SiteDomain) => {
    const path = page.paths[domain.locale] as string;
    return path === "/" ? `https://${domain.host}` : `https://${domain.host}${path}`;
  };
  const domains = SITE_DOMAINS.filter((domain) => page.paths[domain.locale] !== undefined);
  return [
    ...domains.map((domain) => ({ hreflang: domain.locale, url: urlFor(domain) })),
    { hreflang: "x-default", url: urlFor(domains[0]) },
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

/**
 * On every domain, other languages' paths and the domain's own legacy paths permanently redirect (308) to that
 * domain's canonical path. A page the domain lacks redirects to its fallback page.
 */
export function redirectRules(): PathRule[] {
  return SITE_DOMAINS.flatMap((domain) =>
    PAGES.flatMap((page) => {
      const canonical = pathForLocale(page.key, domain.locale);
      const sources = [
        ...Object.values(page.paths),
        ...Object.values(page.legacyPaths ?? {}).flat(),
      ].filter((path): path is string => path !== undefined && path !== canonical);
      return [...new Set(sources)].map((path) => ({ host: domain.host, source: path, destination: canonical }));
    }),
  );
}

/** Domains whose canonical paths differ from the internal route folders serve them through rewrites. */
export function rewriteRules(): PathRule[] {
  return SITE_DOMAINS.flatMap((domain) =>
    PAGES.filter((page) => page.paths[domain.locale] !== undefined && page.paths[domain.locale] !== internalPath(page.key)).map((page) => ({
      host: domain.host,
      source: page.paths[domain.locale] as string,
      destination: internalPath(page.key),
    })),
  );
}
