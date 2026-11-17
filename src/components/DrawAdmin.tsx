"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { LinkProblem } from "@/components/LinkProblem";
import { MailPanel, type MailStatus } from "@/components/MailPanel";
import { formattingLocales } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { translateParticipantLinkStatus, type ParticipantLinkStatus } from "@/i18n/status";
import { api, ensureSession, linkProblemCode } from "@/lib/client";
import type { ApiErrorCode } from "@/lib/api-error";

type AdminDraw = {
  title?: string;
  organizerName: string;
  date?: string;
  budget?: string;
  expiresAt?: string;
  emailStatus?: MailStatus;
  recoverable: boolean;
  participants: Array<{
    id: string;
    name: string;
    status: ParticipantLinkStatus;
  }>;
};

type AdminResponse = { draw: AdminDraw; emailAvailable: boolean };

export function DrawAdmin() {
  const { locale, t } = useI18n();
  const started = useRef(false);
  const [draw, setDraw] = useState<AdminDraw>();
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [newLinks, setNewLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<ApiErrorCode>();
  const [busyId, setBusyId] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [date, setDate] = useState("");
  const [dateMessage, setDateMessage] = useState("");

  const formatDay = useCallback(
    (iso: string) => new Intl.DateTimeFormat(formattingLocales[locale], { dateStyle: "long" }).format(new Date(iso)),
    [locale],
  );

  const refresh = useCallback(async () => {
    const result = await api<AdminResponse>("/api/draws/admin");
    setDraw(result.draw);
    setEmailAvailable(result.emailAvailable);
    return result.draw;
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        await ensureSession();
        const loaded = await refresh();
        setDate(loaded.date ?? "");
      } catch (loadError) {
        setError((loadError as Error).message);
        setErrorCode(linkProblemCode(loadError));
      }
    })();
  }, [refresh]);

  if (deleted) {
    return (
      <section className="tool-card">
        <div className="notice success" role="status">
          <strong>{t("draw.admin.deletedTitle")}</strong>
          <span>{t("draw.admin.deletedBody")}</span>
        </div>
      </section>
    );
  }

  if (!draw) {
    return (
      <div className="tool-card loading">
        {errorCode ? (
          <LinkProblem role="organizer" code={errorCode} message={error} />
        ) : error ? (
          <div className="notice error" role="alert">{error}</div>
        ) : (
          t("draw.admin.loading")
        )}
      </div>
    );
  }

  const groupName = draw.title || t("draw.admin.defaultGroup");
  const pending = draw.participants.filter((participant) => participant.status !== "viewed");
  const viewedCount = draw.participants.length - pending.length;

  async function saveDate(event: FormEvent) {
    event.preventDefault();
    setBusyId("date");
    setError("");
    setDateMessage("");
    try {
      const result = await api<{ date?: string; expiresAt?: string }>("/api/draws/admin", {
        method: "PATCH",
        body: JSON.stringify({ date }),
      });
      await refresh();
      setDateMessage(t("draw.admin.dateSaved", { date: result.expiresAt ? formatDay(result.expiresAt) : "" }));
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="tool-card">
      <span className="eyebrow">{t("draw.admin.eyebrow")}</span>
      <h2>{draw.title || t("draw.admin.defaultTitle")}</h2>
      <p className="muted">
        {t("draw.admin.organizedBy", { name: draw.organizerName })}
        {draw.budget ? ` · ${draw.budget}` : ""}
      </p>
      <div className="notice warning">
        <strong>{t("draw.admin.hiddenTitle")}</strong>
        <span>{t("draw.admin.hiddenBody")}</span>
      </div>
      {error ? <div className="notice error" role="alert">{error}</div> : null}

      <p className="draw-progress" role="status">
        {pending.length === 0
          ? t("draw.admin.allViewed")
          : t("draw.admin.progress", { viewed: viewedCount, total: draw.participants.length })}
      </p>
      <ul className="participant-list">
        {draw.participants.map((participant) => {
          const replacement = newLinks[participant.id];
          const message = replacement
            ? t("draw.admin.replacementMessage", { name: participant.name, url: replacement })
            : "";
          const reminder = t("draw.admin.remindMessage", { name: participant.name, group: groupName });
          return (
            <li className="participant-row" key={participant.id}>
              <div className="participant-name">
                <strong>{participant.name}</strong>
                <small>
                  {replacement
                    ? t("draw.admin.newLinkAvailable")
                    : translateParticipantLinkStatus(participant.status, locale)}
                </small>
                {replacement ? (
                  <div className="link-box" style={{ marginTop: ".6rem" }}>
                    <code>{replacement}</code>
                    <CopyButton value={message} label={t("draw.admin.copyMessage")} />
                  </div>
                ) : null}
                {!replacement && participant.status !== "viewed" ? (
                  <div className="button-row reminder-row">
                    <CopyButton value={reminder} label={t("draw.admin.remindCopy")} />
                    <a className="button button-small button-secondary" href={`https://wa.me/?text=${encodeURIComponent(reminder)}`} target="_blank" rel="noopener noreferrer">
                      {t("draw.admin.remindWhatsapp")}
                    </a>
                  </div>
                ) : null}
              </div>
              <button
                className="button button-secondary button-small"
                disabled={Boolean(busyId)}
                type="button"
                onClick={async () => {
                  if (!window.confirm(t("draw.admin.confirmReplace", { name: participant.name }))) return;
                  setBusyId(participant.id);
                  setError("");
                  try {
                    const result = await api<{ url: string }>("/api/draws/admin", {
                      method: "POST",
                      body: JSON.stringify({ action: "regenerate", participantId: participant.id }),
                    });
                    setNewLinks((current) => ({ ...current, [participant.id]: result.url }));
                    await refresh();
                  } catch (actionError) {
                    setError((actionError as Error).message);
                  } finally {
                    setBusyId("");
                  }
                }}
              >
                {busyId === participant.id ? t("draw.admin.replacing") : t("draw.admin.replace")}
              </button>
            </li>
          );
        })}
      </ul>

      {pending.length > 1 ? (
        <div className="reminder-group">
          <p className="hint">{t("draw.admin.remindHint")}</p>
          <CopyButton
            value={t("draw.admin.remindGroupMessage", { names: pending.map((participant) => participant.name).join(", "), group: groupName })}
            label={t("draw.admin.remindGroupCopy")}
          />
        </div>
      ) : pending.length === 1 ? (
        <p className="hint">{t("draw.admin.remindHint")}</p>
      ) : null}

      <form className="date-form" onSubmit={saveDate}>
        <div className="field">
          <label htmlFor="draw-admin-date">{t("draw.admin.dateLabel")}</label>
          <input id="draw-admin-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-describedby="draw-admin-date-hint" />
          <p className="hint" id="draw-admin-date-hint">{t("draw.admin.dateHint")}</p>
        </div>
        {draw.expiresAt ? <p className="muted">{t("expiry.until", { date: formatDay(draw.expiresAt) })}</p> : null}
        {dateMessage ? <div className="notice success" role="status">{dateMessage}</div> : null}
        <button className="button button-secondary" disabled={Boolean(busyId)} type="submit">
          {busyId === "date" ? t("draw.admin.dateSaving") : t("draw.admin.dateSave")}
        </button>
      </form>

      <MailPanel
        endpoint="/api/draws/admin"
        status={draw.emailStatus}
        recoverable={draw.recoverable}
        emailAvailable={emailAvailable}
        onRefresh={async () => { await refresh(); }}
      />

      <div className="button-row">
        <button
          className="button button-danger"
          disabled={Boolean(busyId)}
          type="button"
          onClick={async () => {
            if (!window.confirm(t("draw.admin.deleteConfirm"))) return;
            setBusyId("delete");
            setError("");
            try {
              await api("/api/draws/admin", { method: "DELETE", body: "{}" });
              setDeleted(true);
            } catch (deleteError) {
              setError((deleteError as Error).message);
            } finally {
              setBusyId("");
            }
          }}
        >
          {busyId === "delete" ? t("draw.admin.deleting") : t("draw.admin.delete")}
        </button>
      </div>
    </section>
  );
}
