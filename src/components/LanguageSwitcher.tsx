"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/config";

type LanguageLinks = Record<string, Record<Locale, string>>;

const LABELS: Record<Locale, string> = { nl: "NL", en: "EN" };
const NAMES: Record<Locale, string> = { nl: "Nederlands", en: "English" };

/**
 * On public pages of the production domains the switcher links to the same page on the other domain (a crawlable
 * link with hreflang). Everywhere else, including personal links whose session cookie is per domain, it keeps
 * switching the language of the current page with a cookie.
 */
export function LanguageSwitcher({ links }: { links: LanguageLinks | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const targets = links?.[pathname];

  if (targets) {
    const other = (Object.keys(targets) as Locale[]).find((candidate) => candidate !== locale);
    if (other) {
      return (
        <span className="language-switcher language-links">
          <span className="sr-only">{t("language.label")}</span>
          <span aria-current="true" lang={locale}>{LABELS[locale]}</span>
          <a
            href={targets[other]}
            hrefLang={other}
            lang={other}
            title={NAMES[other]}
            onClick={() => {
              // A leftover manual choice on this domain must not override its default language later.
              document.cookie = "ll_locale=; Path=/; Max-Age=0; SameSite=Lax";
            }}
          >
            {LABELS[other]}
          </a>
        </span>
      );
    }
  }

  return (
    <label className="language-switcher">
      <span className="sr-only">{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as Locale;
          document.cookie = `ll_locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
          document.documentElement.lang = nextLocale;
          router.refresh();
        }}
      >
        <option value="nl">NL</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
