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
  note?: string;
  redrawnAt?: string;
  reminder?: { sendOn: string };
  emailStatus?: MailStatus;
  recoverable: boolean;
  participants: Array<{
    id: string;
    name: string;
    status: ParticipantLinkStatus;
  }>;
};

type AdminResponse = { draw: AdminDraw; emailAvailable: boolean; reminderAvailable?: boolean };

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
  const [note, setNote] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [addedLinks, setAddedLinks] = useState<Array<{ name: string; url: string }>>([]);
  const [peopleMessage, setPeopleMessage] = useState("");
  const [reminderAvailable, setReminderAvailable] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");

  const formatDay = useCallback(
    (iso: string) => new Intl.DateTimeFormat(formattingLocales[locale], { dateStyle: "long" }).format(new Date(iso)),
    [locale],
  );

  const refresh = useCallback(async () => {
    const result = await api<AdminResponse>("/api/draws/admin");
    setDraw(result.draw);
    setEmailAvailable(result.emailAvailable);
    setReminderAvailable(Boolean(result.reminderAvailable));
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
        setNote(loaded.note ?? "");
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

  async function redraw(change: { addNames?: string[]; removeIds?: string[] }, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusyId("redraw");
    setError("");
    setPeopleMessage("");
    try {
      const result = await api<{ added: Array<{ name: string; url: string }> }>("/api/draws/admin", {
        method: "POST",
        body: JSON.stringify({ action: "redraw", ...change }),
      });
      setAddedLinks(result.added);
      setNewLinks({});
      setNewName("");
      await refresh();
      setPeopleMessage(t("draw.admin.redrawDone"));
    } catch (redrawError) {
      setError((redrawError as Error).message);
    } finally {
      setBusyId("");
    }
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    setBusyId("note");
    setError("");
    setNoteMessage("");
    try {
      await api("/api/draws/admin", { method: "PATCH", body: JSON.stringify({ note }) });
      await refresh();
      setNoteMessage(t("draw.admin.noteSaved"));
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setBusyId("");
    }
  }

  async function reminder(action: "set_reminder" | "clear_reminder") {
    setBusyId("reminder");
    setError("");
    try {
      await api("/api/draws/admin", { method: "POST", body: JSON.stringify({ action, email: reminderEmail }) });
      setReminderEmail("");
      await refresh();
    } catch (reminderError) {
      setError((reminderError as Error).message);
    } finally {
      setBusyId("");
    }
  }

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
              <div className="button-row">
              {draw.participants.length > 3 ? (
                <button
                  className="button button-secondary button-small"
                  disabled={Boolean(busyId)}
                  type="button"
                  aria-label={t("draw.admin.removeLabel", { name: participant.name })}
                  onClick={() => void redraw({ removeIds: [participant.id] }, t("draw.admin.confirmRemove", { name: participant.name }))}
                >
                  {t("draw.admin.remove")}
                </button>
              ) : null}
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
              </div>
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

      <section className="admin-block" aria-labelledby="people-title">
        <h3 id="people-title">{t("draw.admin.peopleTitle")}</h3>
        <p className="hint">{t("draw.admin.peopleHint")}</p>
        {draw.redrawnAt ? <p className="muted">{t("draw.reveal.redrawn", { date: formatDay(draw.redrawnAt) })}</p> : null}
        {addedLinks.map((link) => (
          <div className="link-box" key={link.url}>
            <code>{link.url}</code>
            <CopyButton value={t("draw.admin.replacementMessage", { name: link.name, url: link.url })} label={t("draw.admin.copyMessage")} />
          </div>
        ))}
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (newName.trim()) void redraw({ addNames: [newName.trim()] }, t("draw.admin.confirmAdd", { name: newName.trim() }));
          }}
        >
          <div className="field">
            <label htmlFor="draw-admin-add">{t("draw.admin.addLabel")}</label>
            <input id="draw-admin-add" maxLength={80} value={newName} onChange={(event) => setNewName(event.target.value)} />
          </div>
          <button className="button button-secondary" disabled={Boolean(busyId) || !newName.trim()} type="submit">{t("draw.admin.addSubmit")}</button>
        </form>
        <button className="button button-secondary" disabled={Boolean(busyId)} type="button" onClick={() => void redraw({}, t("draw.admin.confirmRedraw"))}>
          {busyId === "redraw" ? t("draw.admin.redrawing") : t("draw.admin.redrawOnly")}
        </button>
        {peopleMessage ? <div className="notice success" role="status">{peopleMessage}</div> : null}
      </section>

      <form className="admin-block" onSubmit={saveNote}>
        <div className="field">
          <label htmlFor="draw-admin-note">{t("draw.admin.noteLabel")}</label>
          <textarea id="draw-admin-note" maxLength={500} rows={3} value={note} onChange={(event) => setNote(event.target.value)} aria-describedby="draw-admin-note-hint" />
          <p className="hint" id="draw-admin-note-hint">{t("draw.admin.noteHint")}</p>
        </div>
        {noteMessage ? <div className="notice success" role="status">{noteMessage}</div> : null}
        <button className="button button-secondary" disabled={Boolean(busyId)} type="submit">{t("draw.admin.noteSave")}</button>
      </form>

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

      <section className="admin-block" aria-labelledby="reminder-title">
        <h3 id="reminder-title">{t("draw.admin.reminderTitle")}</h3>
        <p className="hint">{t("draw.admin.reminderBody")}</p>
        {draw.reminder ? (
          <>
            <p role="status">{t("draw.admin.reminderOn", { date: formatDay(draw.reminder.sendOn) })}</p>
            <button className="button button-secondary" disabled={Boolean(busyId)} type="button" onClick={() => void reminder("clear_reminder")}>{t("draw.admin.reminderClear")}</button>
          </>
        ) : !reminderAvailable ? (
          <p className="hint">{t("draw.admin.reminderUnavailable")}</p>
        ) : !draw.date ? (
          <p className="hint">{t("draw.admin.reminderNeedsDate")}</p>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); void reminder("set_reminder"); }}>
            <div className="field">
              <label htmlFor="reminder-email">{t("draw.admin.reminderEmailLabel")}</label>
              <input id="reminder-email" type="email" autoComplete="email" required maxLength={254} value={reminderEmail} onChange={(event) => setReminderEmail(event.target.value)} />
            </div>
            <button className="button button-secondary" disabled={Boolean(busyId)} type="submit">{t("draw.admin.reminderSet")}</button>
          </form>
        )}
      </section>

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
