"use client";

import { type FormEvent, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { api } from "@/lib/client";

export function RecoverForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/recovery", { method: "POST", body: JSON.stringify({ email }) });
      setDone(true);
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool-card">
      {done ? (
        <div className="notice success" role="status">
          <strong>{t("recover.doneTitle")}</strong>
          <span>{t("recover.doneBody")}</span>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="recover-email">{t("recover.emailLabel")}</label>
            <input id="recover-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {error ? <div className="notice error" role="alert">{error}</div> : null}
          <button className="button" disabled={busy} type="submit">{busy ? t("recover.sending") : t("recover.submit")}</button>
        </form>
      )}
      <div className="notice">
        <strong>{t("recover.noRecoveryTitle")}</strong>
        <span>{t("recover.noRecoveryBody")}</span>
      </div>
    </div>
  );
}
