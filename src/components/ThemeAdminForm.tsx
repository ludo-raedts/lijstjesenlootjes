"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  logoutAdminAction,
  saveThemeSettingsAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";
import {
  layoutIds,
  themeDefinitions,
  themeIds,
  type LayoutId,
  type ResolvedAppearance,
  type ThemeId,
  type ThemeSettings,
} from "@/lib/theme";

const themeLabelKeys: Record<ThemeId, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  neutral: "admin.theme.neutral",
  sinterklaas: "admin.theme.sinterklaas",
  christmas: "admin.theme.christmas",
  winter: "admin.theme.winter",
  spring: "admin.theme.spring",
  summer: "admin.theme.summer",
  autumn: "admin.theme.autumn",
};

const layoutLabelKeys: Record<LayoutId, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  editorial: "admin.layout.editorial",
  split: "admin.layout.split",
  showcase: "admin.layout.showcase",
};

export function ThemeAdminForm({
  settings,
  appearance,
}: {
  settings: ThemeSettings;
  appearance: ResolvedAppearance;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const initialState: AdminActionState = { code: "idle" };
  const [state, action, pending] = useActionState(saveThemeSettingsAction, initialState);
  const formSettings = state.code === "saved" && state.settings ? state.settings : settings;

  useEffect(() => {
    if (state.code === "saved") router.refresh();
  }, [router, state.code]);

  const errorKey = state.code === "unauthorized"
    ? "admin.save.unauthorized"
    : state.code === "invalid_settings"
      ? "admin.save.invalid"
      : undefined;

  return (
    <>
      <section className="admin-current" aria-labelledby="admin-current-title">
        <div>
          <span className="eyebrow">{t("admin.current.eyebrow")}</span>
          <h2 id="admin-current-title">{t(themeLabelKeys[appearance.theme])}</h2>
          <p>{t(layoutLabelKeys[appearance.layout])}</p>
        </div>
        <div className="admin-current-meta">
          <span>{appearance.themeSource === "automatic" ? t("admin.source.automatic") : t("admin.source.manual")}</span>
          <span>{appearance.layoutSource === "automatic" ? t("admin.layoutSource.automatic") : t("admin.layoutSource.manual")}</span>
        </div>
        <form action={logoutAdminAction}>
          <button className="button button-secondary button-small" type="submit">{t("admin.logout")}</button>
        </form>
      </section>

      <form action={action} className="admin-settings-form" key={formSettings.updatedAt ?? "default"}>
        <section className="tool-card" aria-labelledby="admin-theme-title">
          <span className="eyebrow">{t("admin.theme.eyebrow")}</span>
          <h2 id="admin-theme-title">{t("admin.theme.title")}</h2>
          <div className="admin-two-column">
            <div className="field">
              <label htmlFor="theme-mode">{t("admin.theme.mode")}</label>
              <select id="theme-mode" name="themeMode" defaultValue={formSettings.themeMode}>
                <option value="automatic">{t("admin.mode.automatic")}</option>
                <option value="manual">{t("admin.mode.manual")}</option>
              </select>
              <span className="hint">{t("admin.theme.modeHint")}</span>
            </div>
            <div className="field">
              <label htmlFor="manual-theme">{t("admin.theme.manual")}</label>
              <select id="manual-theme" name="manualTheme" defaultValue={formSettings.manualTheme}>
                {themeIds.map((theme) => <option key={theme} value={theme}>{t(themeLabelKeys[theme])}</option>)}
              </select>
              <span className="hint">{t("admin.theme.manualHint")}</span>
            </div>
          </div>
        </section>

        <section className="tool-card" aria-labelledby="admin-layout-title">
          <span className="eyebrow">{t("admin.layout.eyebrow")}</span>
          <h2 id="admin-layout-title">{t("admin.layout.title")}</h2>
          <div className="admin-two-column">
            <div className="field">
              <label htmlFor="layout-mode">{t("admin.layout.mode")}</label>
              <select id="layout-mode" name="layoutMode" defaultValue={formSettings.layoutMode}>
                <option value="automatic">{t("admin.mode.automatic")}</option>
                <option value="manual">{t("admin.mode.manual")}</option>
              </select>
              <span className="hint">{t("admin.layout.modeHint")}</span>
            </div>
            <div className="field">
              <label htmlFor="manual-layout">{t("admin.layout.manual")}</label>
              <select id="manual-layout" name="manualLayout" defaultValue={formSettings.manualLayout}>
                {layoutIds.map((layout) => <option key={layout} value={layout}>{t(layoutLabelKeys[layout])}</option>)}
              </select>
              <span className="hint">{t("admin.layout.manualHint")}</span>
            </div>
          </div>
        </section>

        <section className="tool-card" aria-labelledby="admin-schedule-title">
          <span className="eyebrow">{t("admin.schedule.eyebrow")}</span>
          <h2 id="admin-schedule-title">{t("admin.schedule.title")}</h2>
          <p className="muted">{t("admin.schedule.body")}</p>
          <div className="admin-schedule-grid">
            <MonthDayField name="sinterklaasStart" value={formSettings.schedule.sinterklaasStart} label={t("admin.schedule.sinterklaasStart")} />
            <MonthDayField name="sinterklaasEnd" value={formSettings.schedule.sinterklaasEnd} label={t("admin.schedule.sinterklaasEnd")} />
            <MonthDayField name="christmasStartNl" value={formSettings.schedule.christmasStartNl} label={t("admin.schedule.christmasStartNl")} />
            <MonthDayField name="christmasStartEn" value={formSettings.schedule.christmasStartEn} label={t("admin.schedule.christmasStartEn")} />
            <MonthDayField name="christmasEnd" value={formSettings.schedule.christmasEnd} label={t("admin.schedule.christmasEnd")} />
          </div>
        </section>

        {state.code === "saved" ? <p className="notice success" role="status">{t("admin.save.success")}</p> : null}
        {errorKey ? <p className="notice error" role="alert">{t(errorKey)}</p> : null}
        <button className="button admin-save" type="submit" disabled={pending}>
          {pending ? t("admin.save.saving") : t("admin.save.submit")}
        </button>
      </form>

      <section className="admin-gallery" aria-labelledby="admin-gallery-title">
        <header>
          <span className="eyebrow">{t("admin.gallery.eyebrow")}</span>
          <h2 id="admin-gallery-title">{t("admin.gallery.title")}</h2>
          <p className="muted">{t("admin.gallery.body")}</p>
        </header>
        <div className="admin-theme-grid">
          {themeIds.map((theme) => {
            const definition = themeDefinitions[theme];
            return (
              <article className={appearance.theme === theme ? "is-active" : undefined} key={theme}>
                <img
                  src={definition.desktopImage}
                  alt=""
                  width={1536}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <h3>{t(themeLabelKeys[theme])}</h3>
                  <p>{t(layoutLabelKeys[definition.defaultLayout])}</p>
                </div>
                {appearance.theme === theme ? <span>{t("admin.gallery.active")}</span> : null}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function MonthDayField({ name, value, label }: { name: string; value: string; label: string }) {
  const { t } = useI18n();
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={value} inputMode="numeric" pattern="[0-9]{2}-[0-9]{2}" placeholder="MM-DD" required />
      <span className="hint">{t("admin.schedule.format")}</span>
    </div>
  );
}
