import "server-only";

import { cookies } from "next/headers";
import { formattingLocales, normalizeLocale } from "@/i18n/config";
import { createTranslator } from "@/i18n/messages";

export const LOCALE_COOKIE = "ll_locale";

export async function getServerI18n() {
  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    formattingLocale: formattingLocales[locale],
    t: createTranslator(locale),
  };
}
