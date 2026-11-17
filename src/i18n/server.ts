import "server-only";

import { cookies } from "next/headers";
import { defaultLocale, formattingLocales, normalizeLocale } from "@/i18n/config";
import { createTranslator } from "@/i18n/messages";
import { localeForHost } from "@/lib/domains";
import { getRequestHost } from "@/lib/request-site";

export const LOCALE_COOKIE = "ll_locale";

/** An explicit visitor choice (cookie) wins; otherwise the domain decides; otherwise the default locale. */
export async function getServerI18n() {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = cookieLocale
    ? normalizeLocale(cookieLocale)
    : (localeForHost(await getRequestHost()) ?? defaultLocale);
  return {
    locale,
    formattingLocale: formattingLocales[locale],
    t: createTranslator(locale),
  };
}
