"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  allowAdminLogin,
  createAdminSession,
  deleteAdminSession,
  hasAdminSession,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import {
  isMonthDay,
  layoutIds,
  themeIds,
  type LayoutId,
  type ThemeId,
  type ThemeSettings,
} from "@/lib/theme";
import { saveThemeSettings } from "@/lib/theme-store";

export type AdminActionCode =
  | "idle"
  | "invalid_credentials"
  | "rate_limited"
  | "not_configured"
  | "unauthorized"
  | "invalid_settings"
  | "saved";

export type AdminActionState = {
  code: AdminActionCode;
  settings?: ThemeSettings;
};

export async function loginAdminAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!isAdminConfigured()) return { code: "not_configured" };
  const headerStore = await headers();
  const identifier = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowAdminLogin(identifier)) return { code: "rate_limited" };
  const password = formData.get("password");
  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return { code: "invalid_credentials" };
  }
  await createAdminSession();
  redirect("/admin");
}

function oneOf<T extends string>(value: FormDataEntryValue | null, values: readonly T[]): T | undefined {
  return typeof value === "string" && values.includes(value as T) ? value as T : undefined;
}

function parseSettings(formData: FormData): ThemeSettings | undefined {
  const themeMode = oneOf(formData.get("themeMode"), ["automatic", "manual"] as const);
  const manualTheme = oneOf(formData.get("manualTheme"), themeIds) as ThemeId | undefined;
  const layoutMode = oneOf(formData.get("layoutMode"), ["automatic", "manual"] as const);
  const manualLayout = oneOf(formData.get("manualLayout"), layoutIds) as LayoutId | undefined;
  const sinterklaasStart = formData.get("sinterklaasStart");
  const sinterklaasEnd = formData.get("sinterklaasEnd");
  const christmasStartNl = formData.get("christmasStartNl");
  const christmasStartEn = formData.get("christmasStartEn");
  const christmasEnd = formData.get("christmasEnd");

  if (
    !themeMode || !manualTheme || !layoutMode || !manualLayout
    || !isMonthDay(sinterklaasStart) || !isMonthDay(sinterklaasEnd)
    || !isMonthDay(christmasStartNl) || !isMonthDay(christmasStartEn)
    || !isMonthDay(christmasEnd)
  ) {
    return undefined;
  }

  return {
    themeMode,
    manualTheme,
    layoutMode,
    manualLayout,
    schedule: {
      sinterklaasStart,
      sinterklaasEnd,
      christmasStartNl,
      christmasStartEn,
      christmasEnd,
    },
  };
}

export async function saveThemeSettingsAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!await hasAdminSession()) return { code: "unauthorized" };
  const settings = parseSettings(formData);
  if (!settings) return { code: "invalid_settings" };
  const savedSettings = await saveThemeSettings(settings);
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  return { code: "saved", settings: savedSettings };
}

export async function logoutAdminAction() {
  await deleteAdminSession();
  redirect("/admin");
}
