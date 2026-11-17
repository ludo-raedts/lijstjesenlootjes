"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { createTranslator, type Translator } from "@/i18n/messages";

type I18nValue = {
  locale: Locale;
  t: Translator;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
