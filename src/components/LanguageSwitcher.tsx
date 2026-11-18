"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/config";

type LanguageLinks = Record<string, Record<Locale, string>>;

const LABELS: Record<Locale, string> = { nl: "NL", en: "EN", de: "DE" };
const NAMES: Record<Locale, string> = { nl: "Nederlands", en: "English", de: "Deutsch" };

function chooseLocale(locale: Locale) {
  document.cookie = `ll_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.lang = locale;
}

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
    // Dutch and English live on their own domains and are plain links; German has no domain, so it is a cookie choice.
    const domainLocales = Object.keys(targets) as Locale[];
    return (
      <span className="language-switcher language-links">
        <span className="sr-only">{t("language.label")}</span>
        {domainLocales.map((candidate) =>
          candidate === locale ? (
            <span aria-current="true" key={candidate} lang={candidate}>{LABELS[candidate]}</span>
          ) : (
            <a
              href={targets[candidate]}
              hrefLang={candidate}
              key={candidate}
              lang={candidate}
              title={NAMES[candidate]}
              onClick={() => {
                // A leftover manual choice on this domain must not override its default language later.
                document.cookie = "ll_locale=; Path=/; Max-Age=0; SameSite=Lax";
              }}
            >
              {LABELS[candidate]}
            </a>
          ),
        )}
        {locale === "de" ? (
          <span aria-current="true" lang="de">{LABELS.de}</span>
        ) : (
          <button className="language-switch-button" type="button" lang="de" title={NAMES.de} onClick={() => { chooseLocale("de"); router.refresh(); }}>
            {LABELS.de}
          </button>
        )}
      </span>
    );
  }

  return (
    <label className="language-switcher">
      <span className="sr-only">{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => {
          chooseLocale(event.target.value as Locale);
          router.refresh();
        }}
      >
        <option value="nl">NL</option>
        <option value="en">EN</option>
        <option value="de">DE</option>
      </select>
    </label>
  );
}
