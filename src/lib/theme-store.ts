import "server-only";

import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { read, transaction } from "@/lib/store";
import {
  normalizeThemeSettings,
  resolveAppearance,
  type ThemeSettings,
} from "@/lib/theme";

export const getThemeSettings = cache(async () => read((database) =>
  normalizeThemeSettings(database.siteSettings?.theme),
));

export async function getActiveAppearance(locale: Locale, date = new Date()) {
  return resolveAppearance(await getThemeSettings(), locale, date);
}

export async function saveThemeSettings(settingsValue: ThemeSettings) {
  const settings = normalizeThemeSettings(settingsValue);
  settings.updatedAt = new Date().toISOString();
  await transaction((database) => {
    database.siteSettings = {
      ...database.siteSettings,
      theme: settings,
    };
  });
  return settings;
}
