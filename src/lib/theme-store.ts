import "server-only";

import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { read, transaction } from "@/lib/store";
import {
  normalizeThemeSettings,
  resolveAppearance,
  themeSettingsTtlMs,
  type ThemeSettings,
} from "@/lib/theme";

/**
 * Every page render needs the theme settings, and they read the whole application document. Settings change rarely,
 * so each server instance keeps them for a short time; a save on the same instance refreshes them at once, and other
 * instances catch up within the TTL. A failed read never replaces a good cached value.
 */
let cached: { settings: ThemeSettings; expiresAt: number } | undefined;

async function loadThemeSettings(now = Date.now()) {
  if (cached && cached.expiresAt > now) return cached.settings;
  try {
    const settings = await read((database) => normalizeThemeSettings(database.siteSettings?.theme));
    cached = { settings, expiresAt: now + themeSettingsTtlMs() };
    return settings;
  } catch (error) {
    if (cached) return cached.settings;
    throw error;
  }
}

export const getThemeSettings = cache(() => loadThemeSettings());

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
  cached = { settings, expiresAt: Date.now() + themeSettingsTtlMs() };
  return settings;
}
