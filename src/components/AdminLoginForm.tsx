"use client";

import { useActionState } from "react";
import {
  loginAdminAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";

export function AdminLoginForm() {
  const { t } = useI18n();
  const initialState: AdminActionState = { code: "idle" };
  const [state, action, pending] = useActionState(loginAdminAction, initialState);
  const messageKey = state.code === "invalid_credentials"
    ? "admin.login.invalid"
    : state.code === "rate_limited"
      ? "admin.login.rateLimited"
      : state.code === "not_configured"
        ? "admin.setup.body"
        : undefined;

  return (
    <form action={action} className="tool-card admin-login-card">
      <h2>{t("admin.login.title")}</h2>
      <p className="muted">{t("admin.login.body")}</p>
      <div className="field">
        <label htmlFor="admin-password">{t("admin.login.password")}</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {messageKey ? <p className="notice error" role="alert">{t(messageKey)}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? t("admin.login.submitting") : t("admin.login.submit")}
      </button>
    </form>
  );
}
