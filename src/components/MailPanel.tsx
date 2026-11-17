"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { formattingLocales } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { api } from "@/lib/client";
import { pathForHost } from "@/lib/paths";

export type MailStatus = { state: "queued" | "sent" | "failed"; at: string };

/**
 * Shows whether the link email arrived and lets the organizer mail a fresh management link to an address typed
 * now. The address is used for that one send and never stored; recovery stores only a keyed hash, and only if asked.
 */
export function MailPanel({
  endpoint,
  status,
  recoverable,
  emailAvailable,
  onRefresh,
}: {
  endpoint: string;
  status?: MailStatus;
  recoverable: boolean;
  emailAvailable: boolean;
  onRefresh: () => void | Promise<void>;
}) {
  const { locale, t } = useI18n();
  const [email, setEmail] = useState("");
  const [recover, setRecover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const polls = useRef(0);

  // While a mail is still on its way, check back a few times so the status turns into sent or failed.
  useEffect(() => {
    if (status?.state !== "queued") {
      polls.current = 0;
      return;
    }
    const timer = setInterval(() => {
      polls.current += 1;
      if (polls.current > 10) return clearInterval(timer);
      void onRefresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [status?.state, onRefresh]);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(formattingLocales[locale], { dateStyle: "long", timeStyle: "short" }).format(new Date(iso));

  const statusText = !status
    ? t("mailPanel.status.none")
    : status.state === "queued"
      ? t("mailPanel.status.queued")
      : t(status.state === "sent" ? "mailPanel.status.sent" : "mailPanel.status.failed", { date: formatDate(status.at) });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(endpoint, { method: "POST", body: JSON.stringify({ action: "email_link", email, recoverable: recover || recoverable }) });
      setEmail("");
      await onRefresh();
    } catch (sendError) {
      setError((sendError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mail-panel" aria-labelledby="mail-panel-title">
      <h3 id="mail-panel-title">{t("mailPanel.title")}</h3>
      <p className="muted" role="status">{statusText}</p>
      {recoverable ? (
        <p className="hint">
          {t("mailPanel.recoverableOn")}{" "}
          <Link href={pathForHost("recover", typeof window === "undefined" ? null : window.location.host)}>{t("mailPanel.recoverLink")}</Link>
        </p>
      ) : null}
      {emailAvailable ? (
        <form onSubmit={submit}>
          <p className="hint">{t("mailPanel.body")}</p>
          <div className="field">
            <label htmlFor="mail-panel-email">{t("mailPanel.emailLabel")}</label>
            <input id="mail-panel-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {!recoverable ? (
            <label className="checkbox-label">
              <input type="checkbox" checked={recover} onChange={(event) => setRecover(event.target.checked)} />
              {t("recover.optIn.label")}
            </label>
          ) : null}
          {error ? <div className="notice error" role="alert">{error}</div> : null}
          <button className="button button-secondary" disabled={busy} type="submit">{busy ? t("mailPanel.sending") : t("mailPanel.send")}</button>
        </form>
      ) : (
        <p className="hint">{t("mailPanel.unavailable")}</p>
      )}
    </section>
  );
}
