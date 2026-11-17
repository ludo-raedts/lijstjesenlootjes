export const supportedLocales = ["nl", "en"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "nl";

export const formattingLocales: Record<Locale, string> = {
  nl: "nl-NL",
  en: "en-GB",
};

export function normalizeLocale(value: string | null | undefined): Locale {
  const language = value?.toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(language as Locale) ? (language as Locale) : defaultLocale;
}

export function getActiveLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  return normalizeLocale(document.documentElement.lang);
}
