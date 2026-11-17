import { enMessages } from "@/i18n/messages/en";
import { nlMessages, type MessageKey } from "@/i18n/messages/nl";
import type { Locale } from "@/i18n/config";

export type MessageParams = Record<string, string | number>;
export type Translator = (key: MessageKey, params?: MessageParams) => string;

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  nl: nlMessages,
  en: enMessages,
};

export function translate(locale: Locale, key: MessageKey, params: MessageParams = {}) {
  const template = catalogs[locale][key];
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

export function createTranslator(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}

export type { MessageKey };
