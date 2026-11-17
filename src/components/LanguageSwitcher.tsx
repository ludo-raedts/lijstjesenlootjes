"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale, t } = useI18n();

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
