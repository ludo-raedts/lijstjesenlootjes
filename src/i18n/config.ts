export const supportedLocales = ["nl", "en", "de"] as const;
export type Locale = (typeof supportedLocales)[number];

/** Locales that own a public domain (and so their own URL paths, sitemap and hreflang). German has no domain yet. */
export const siteLocales = ["nl", "en"] as const;
export type SiteLocale = (typeof siteLocales)[number];

/** The domain language that carries the paths for an interface language without a domain of its own. */
export function siteLocaleFor(locale: Locale): SiteLocale {
  return locale === "de" ? "en" : locale;
}

export const defaultLocale: Locale = "nl";

export const formattingLocales: Record<Locale, string> = {
  nl: "nl-NL",
  en: "en-GB",
  de: "de-DE",
};

export function normalizeLocale(value: string | null | undefined): Locale {
  const language = value?.toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(language as Locale) ? (language as Locale) : defaultLocale;
}

export function getActiveLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  return normalizeLocale(document.documentElement.lang);
}
