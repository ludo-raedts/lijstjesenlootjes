import { enMessages } from "@/i18n/messages/en";
import { deMessages } from "@/i18n/messages/de";
import { nlMessages, type MessageKey } from "@/i18n/messages/nl";
import type { Locale } from "@/i18n/config";

export type MessageParams = Record<string, string | number>;
export type Translator = (key: MessageKey, params?: MessageParams) => string;

/**
 * Dutch and English are complete. German may lag behind: a key it does not have yet falls back to English, so a
 * new string added to the other catalogs never breaks the German interface.
 */
const catalogs: Record<Locale, Partial<Record<MessageKey, string>>> = {
  nl: nlMessages,
  en: enMessages,
  de: deMessages,
};

export function translate(locale: Locale, key: MessageKey, params: MessageParams = {}) {
  const template = catalogs[locale][key] ?? enMessages[key];
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

export function createTranslator(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}

export type { MessageKey };
