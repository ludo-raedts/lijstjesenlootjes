import type { Locale } from "@/i18n/config";

export const themeIds = [
  "neutral",
  "sinterklaas",
  "christmas",
  "winter",
  "spring",
  "summer",
  "autumn",
] as const;

export type ThemeId = (typeof themeIds)[number];

export const layoutIds = ["editorial", "split", "showcase"] as const;
export type LayoutId = (typeof layoutIds)[number];

export type ThemeSchedule = {
  sinterklaasStart: string;
  sinterklaasEnd: string;
  christmasStartNl: string;
  christmasStartEn: string;
  christmasEnd: string;
};

export type ThemeSettings = {
  themeMode: "automatic" | "manual";
  manualTheme: ThemeId;
  layoutMode: "automatic" | "manual";
  manualLayout: LayoutId;
  schedule: ThemeSchedule;
  updatedAt?: string;
};

export type ThemeDefinition = {
  id: ThemeId;
  defaultLayout: LayoutId;
  desktopImage: string;
  mobileImage: string;
  cornerMotif: string;
  accentMotif: string;
};

export type ResolvedAppearance = {
  theme: ThemeId;
  layout: LayoutId;
  definition: ThemeDefinition;
  themeSource: "automatic" | "manual";
  layoutSource: "automatic" | "manual";
};

export const defaultThemeSettings: ThemeSettings = {
  themeMode: "automatic",
  manualTheme: "neutral",
  layoutMode: "automatic",
  manualLayout: "editorial",
  schedule: {
    sinterklaasStart: "11-15",
    sinterklaasEnd: "12-05",
    christmasStartNl: "12-06",
    christmasStartEn: "11-15",
    christmasEnd: "12-26",
  },
};

export const themeDefinitions: Record<ThemeId, ThemeDefinition> = {
  neutral: {
    id: "neutral",
    defaultLayout: "editorial",
    desktopImage: "/images/hero-neutral-desktop.avif",
    mobileImage: "/images/hero-neutral-mobile.avif",
    cornerMotif: "/motifs/motif-neutral-flower-corner.svg",
    accentMotif: "/motifs/motif-neutral-sprig.svg",
  },
  sinterklaas: {
    id: "sinterklaas",
    defaultLayout: "split",
    desktopImage: "/images/hero-sinterklaas-desktop.avif",
    mobileImage: "/images/hero-sinterklaas-mobile.avif",
    cornerMotif: "/motifs/motif-sinterklaas-corner.svg",
    accentMotif: "/motifs/motif-sinterklaas-accent.svg",
  },
  christmas: {
    id: "christmas",
    defaultLayout: "showcase",
    desktopImage: "/images/hero-christmas-desktop.avif",
    mobileImage: "/images/hero-christmas-mobile.avif",
    cornerMotif: "/motifs/motif-christmas-corner.svg",
    accentMotif: "/motifs/motif-christmas-accent.svg",
  },
  winter: {
    id: "winter",
    defaultLayout: "split",
    desktopImage: "/images/hero-winter-desktop.avif",
    mobileImage: "/images/hero-winter-mobile.avif",
    cornerMotif: "/motifs/motif-winter-corner.svg",
    accentMotif: "/motifs/motif-winter-accent.svg",
  },
  spring: {
    id: "spring",
    defaultLayout: "editorial",
    desktopImage: "/images/hero-spring-desktop.avif",
    mobileImage: "/images/hero-spring-mobile.avif",
    cornerMotif: "/motifs/motif-spring-corner.svg",
    accentMotif: "/motifs/motif-spring-accent.svg",
  },
  summer: {
    id: "summer",
    defaultLayout: "showcase",
    desktopImage: "/images/hero-summer-desktop.avif",
    mobileImage: "/images/hero-summer-mobile.avif",
    cornerMotif: "/motifs/motif-summer-corner.svg",
    accentMotif: "/motifs/motif-summer-accent.svg",
  },
  autumn: {
    id: "autumn",
    defaultLayout: "editorial",
    desktopImage: "/images/hero-autumn-desktop.avif",
    mobileImage: "/images/hero-autumn-mobile.avif",
    cornerMotif: "/motifs/motif-autumn-corner.svg",
    accentMotif: "/motifs/motif-autumn-accent.svg",
  },
};

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && themeIds.includes(value as ThemeId);
}

function isLayoutId(value: unknown): value is LayoutId {
  return typeof value === "string" && layoutIds.includes(value as LayoutId);
}

export function isMonthDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}-\d{2}$/.test(value)) return false;
  const [month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(2024, month, 0).getDate();
}

export function normalizeThemeSettings(value: unknown): ThemeSettings {
  if (!value || typeof value !== "object") return structuredClone(defaultThemeSettings);
  const input = value as Partial<ThemeSettings>;
  const schedule = input.schedule && typeof input.schedule === "object"
    ? input.schedule as Partial<ThemeSchedule>
    : {};

  return {
    themeMode: input.themeMode === "manual" ? "manual" : "automatic",
    manualTheme: isThemeId(input.manualTheme) ? input.manualTheme : defaultThemeSettings.manualTheme,
    layoutMode: input.layoutMode === "manual" ? "manual" : "automatic",
    manualLayout: isLayoutId(input.manualLayout) ? input.manualLayout : defaultThemeSettings.manualLayout,
    schedule: {
      sinterklaasStart: isMonthDay(schedule.sinterklaasStart) ? schedule.sinterklaasStart : defaultThemeSettings.schedule.sinterklaasStart,
      sinterklaasEnd: isMonthDay(schedule.sinterklaasEnd) ? schedule.sinterklaasEnd : defaultThemeSettings.schedule.sinterklaasEnd,
      christmasStartNl: isMonthDay(schedule.christmasStartNl) ? schedule.christmasStartNl : defaultThemeSettings.schedule.christmasStartNl,
      christmasStartEn: isMonthDay(schedule.christmasStartEn) ? schedule.christmasStartEn : defaultThemeSettings.schedule.christmasStartEn,
      christmasEnd: isMonthDay(schedule.christmasEnd) ? schedule.christmasEnd : defaultThemeSettings.schedule.christmasEnd,
    },
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : undefined,
  };
}

function monthDayAt(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${month}-${day}`;
}

function inDateRange(value: string, start: string, end: string) {
  return start <= end
    ? value >= start && value <= end
    : value >= start || value <= end;
}

export function resolveAutomaticTheme(
  settings: ThemeSettings,
  locale: Locale,
  date = new Date(),
  timeZone = "Europe/Amsterdam",
): ThemeId {
  const value = monthDayAt(date, timeZone);
  const schedule = settings.schedule;

  if (
    locale === "nl"
    && inDateRange(value, schedule.sinterklaasStart, schedule.sinterklaasEnd)
  ) {
    return "sinterklaas";
  }

  const christmasStart = locale === "nl"
    ? schedule.christmasStartNl
    : schedule.christmasStartEn;
  if (inDateRange(value, christmasStart, schedule.christmasEnd)) {
    return "christmas";
  }

  const month = Number(value.slice(0, 2));
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

export function resolveAppearance(
  settingsValue: unknown,
  locale: Locale,
  date = new Date(),
): ResolvedAppearance {
  const settings = normalizeThemeSettings(settingsValue);
  const theme = settings.themeMode === "manual"
    ? settings.manualTheme
    : resolveAutomaticTheme(settings, locale, date);
  const layout = settings.layoutMode === "manual"
    ? settings.manualLayout
    : themeDefinitions[theme].defaultLayout;

  return {
    theme,
    layout,
    definition: themeDefinitions[theme],
    themeSource: settings.themeMode,
    layoutSource: settings.layoutMode,
  };
}

const DEFAULT_THEME_SETTINGS_TTL_MS = 60_000;

/** How long a server instance keeps the theme settings. `THEME_SETTINGS_CACHE_TTL_MS=0` switches the cache off. */
export function themeSettingsTtlMs(value = process.env.THEME_SETTINGS_CACHE_TTL_MS) {
  const parsed = value === undefined || value.trim() === "" ? Number.NaN : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_THEME_SETTINGS_TTL_MS;
}
