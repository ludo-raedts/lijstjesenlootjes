"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { api, copyText } from "@/lib/client";
import { CopyButton } from "@/components/CopyButton";
import { useI18n } from "@/i18n/I18nProvider";

type Person = { id: string; name: string };
type DrawResult = { adminUrl: string; participantLinks: Array<{ participantId: string; name: string; url: string }>; emailStatus: "not_requested" | "queued" | "failed" };
const WHATSAPP_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z";
const person = (): Person => ({ id: crypto.randomUUID(), name: "" });

export function DrawCreate() {
  const { t } = useI18n();
  const submitting = useRef(false);
  const requestId = useRef("");
  const [organizerId] = useState("organizer");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerParticipates, setOrganizerParticipates] = useState(true);
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [recoverable, setRecoverable] = useState(false);
  const [others, setOthers] = useState<Person[]>([{ id: "participant-1", name: "" }, { id: "participant-2", name: "" }]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<DrawResult>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const offset = organizerParticipates ? 1 : 0;
  const participants = useMemo(() => {
    const items = others.filter((item) => item.name.trim());
    return organizerParticipates && organizerName.trim()
      ? [{ id: organizerId, name: organizerName.trim() }, ...items]
      : items;
  }, [organizerId, organizerName, organizerParticipates, others]);
  const exclusions = useMemo(
    () => participants.flatMap((giver) => participants.filter((recipient) => recipient.id !== giver.id && excluded.has(`${giver.id}:${recipient.id}`)).map((recipient) => ({ from: giver.id, to: recipient.id }))),
    [participants, excluded],
  );
  const toggleExclusion = (from: string, to: string, checked: boolean) => setExcluded((current) => {
    const next = new Set(current);
    if (checked) next.add(`${from}:${to}`); else next.delete(`${from}:${to}`);
    return next;
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setError(""); setBusy(true);
    try {
      const created = await api<DrawResult>("/api/draws", { method: "POST", body: JSON.stringify({ requestId: requestId.current, organizerName, title, budget, date, participants, exclusions, note, email, recoverable }) });
      setSentTo(email.trim());
      setResult(created);
    } catch (submitError) { setError((submitError as Error).message); }
    finally { setBusy(false); submitting.current = false; }
  };

  if (result) {
    return (
      <section className="tool-card" aria-live="polite">
        <span className="eyebrow">{t("draw.create.completeEyebrow")}</span><h2>{t("draw.create.completeTitle")}</h2>
        {result.emailStatus === "queued" && <div className="notice" role="status"><strong>{t("email.result.queuedTitle")}</strong><span>{t("email.result.queuedBody", { email: sentTo })}</span></div>}
        {result.emailStatus === "failed" && <div className="notice error" role="alert"><strong>{t("email.result.failedTitle")}</strong><span>{t("email.result.failedBody")}</span></div>}
        <div className="notice warning"><strong>{t("draw.create.keepPageTitle")}</strong><span>{t("draw.create.keepPageBody")}</span></div>
        <div className="link-result"><span className="field-label">{t("draw.create.adminLink")}</span><div className="link-box"><code>{result.adminUrl}</code><CopyButton value={result.adminUrl} label={t("draw.create.copyAdminLink")} /></div></div>
        <h3>{t("draw.create.shareHeading")}</h3>
        <ul className="result-list">
          {result.participantLinks.map((link) => {
            const message = t("draw.create.participantMessage", { name: link.name, group: title || t("draw.create.defaultGroup"), url: link.url });
            return <li className="result-row" key={link.participantId}><div className="participant-name"><strong>{link.name}</strong><small>{t("draw.create.linkAvailable")}</small></div><div className="button-row"><CopyButton track value={link.url} label={t("draw.create.copyLink")} /><CopyButton track value={message} label={t("draw.create.copyMessage")} /><a className="button button-small button-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d={WHATSAPP_PATH} /></svg>{t("draw.create.openWhatsapp")}</a></div></li>;
          })}
        </ul>
        <div className="button-row"><a className="button" href={result.adminUrl}>{t("draw.create.openAdmin")}</a><button className="button button-secondary" type="button" onClick={() => copyText(result.adminUrl)}>{t("draw.create.saveAdmin")}</button></div>
      </section>
    );
  }

  return (
    <form className="tool-card" onSubmit={submit}>
      <div className="step-heading"><span>1</span><h2>{t("draw.create.step1")}</h2></div>
      <div className="field"><label htmlFor="organizer">{t("draw.create.organizerLabel")}</label><input id="organizer" required maxLength={80} value={organizerName} onChange={(event) => setOrganizerName(event.target.value)} placeholder={t("draw.create.namePlaceholder")} /></div>
      <label className="checkbox-label"><input type="checkbox" checked={organizerParticipates} onChange={(event) => setOrganizerParticipates(event.target.checked)} />{t("draw.create.organizerParticipates")}</label>
      <div className="field-row">
        <div className="field"><label htmlFor="draw-title">{t("draw.create.groupLabel")} <span className="hint">{t("common.optional")}</span></label><input id="draw-title" maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("draw.create.groupPlaceholder")} /></div>
        <div className="field"><label htmlFor="budget">{t("draw.create.budgetLabel")} <span className="hint">{t("common.optional")}</span></label><input id="budget" maxLength={40} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder={t("draw.create.budgetPlaceholder")} /></div>
      </div>
      <div className="field"><label htmlFor="draw-date">{t("draw.create.dateLabel")} <span className="hint">{t("common.optional")}</span></label><input id="draw-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>

      <div className="field"><label htmlFor="draw-note">{t("draw.create.noteLabel")} <span className="hint">{t("common.optional")}</span></label><textarea id="draw-note" maxLength={500} rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("draw.create.notePlaceholder")} /></div>

      <div className="field"><label htmlFor="email">{t("email.field.label")} <span className="hint">{t("common.optional")}</span></label><input id="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("email.field.placeholder")} aria-describedby="email-hint" /><p className="hint" id="email-hint">{t("email.field.drawHint")}</p>{email.trim() ? <><label className="checkbox-label"><input type="checkbox" checked={recoverable} onChange={(event) => setRecoverable(event.target.checked)} />{t("recover.optIn.label")}</label><p className="hint">{t("recover.optIn.hint")}</p></> : null}</div>

      <div className="step-heading"><span>2</span><h2>{t("draw.create.step2")}</h2></div>
      <p className="muted">{t("draw.create.participantsHint")}</p>
      <div className="participant-list">
        {organizerParticipates && <div className="participant-row"><div className="field" style={{ margin: 0, flex: 1 }}><label htmlFor="participant-organizer">{t("draw.create.participantLabel", { number: 1 })}</label><input id="participant-organizer" readOnly value={organizerName} placeholder={t("draw.create.organizerPlaceholder")} /></div></div>}
        {others.map((item, index) => <div className="participant-row" key={item.id}><div className="field" style={{ margin: 0, flex: 1 }}><label htmlFor={`participant-${item.id}`}>{t("draw.create.participantLabel", { number: index + 1 + offset })}</label><input id={`participant-${item.id}`} maxLength={80} value={item.name} onChange={(event) => setOthers(others.map((candidate) => candidate.id === item.id ? { ...candidate, name: event.target.value } : candidate))} placeholder={t("draw.create.namePlaceholder")} /></div>{others.length > 2 && <button aria-label={t("draw.create.removeParticipant", { number: index + 1 + offset })} className="button button-danger icon-button" type="button" onClick={() => setOthers(others.filter((candidate) => candidate.id !== item.id))}>×</button>}</div>)}
      </div>
      <button className="button button-secondary" type="button" onClick={() => setOthers([...others, person()])}>{t("draw.create.addParticipant")}</button>

      <div className="step-heading"><span>3</span><h2>{t("draw.create.step3")} <span className="hint">{t("common.optional")}</span></h2></div>
      <details className="exclusions">
        <summary><span>{t("draw.create.exclusionsToggle")}</span>{exclusions.length > 0 && <span className="exclusion-badge">{t("draw.create.exclusionsTotal", { count: exclusions.length })}</span>}</summary>
        <div className="exclusions-body">
          <p className="hint">{t("draw.create.exclusionHint")}</p>
          {participants.length >= 3 ? participants.map((giver) => {
            const count = exclusions.filter((item) => item.from === giver.id).length;
            return (
              <details className="exclusion-person" key={giver.id}>
                <summary><span>{t("draw.create.exclusionPerson", { name: giver.name })}</span>{count > 0 && <span className="exclusion-badge">{t("draw.create.exclusionCount", { count })}</span>}</summary>
                <div className="exclusion-grid">
                  {participants.filter((recipient) => recipient.id !== giver.id).map((recipient) => (
                    <label className="exclusion-row" key={recipient.id}>
                      <input type="checkbox" checked={excluded.has(`${giver.id}:${recipient.id}`)} onChange={(event) => toggleExclusion(giver.id, recipient.id, event.target.checked)} />
                      <span>{recipient.name}</span>
                    </label>
                  ))}
                </div>
              </details>
            );
          }) : <div className="empty-state">{t("draw.create.exclusionEmpty")}</div>}
        </div>
      </details>
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className="button" disabled={busy || participants.length < 3} type="submit">{busy ? t("draw.create.drawing") : t("draw.create.submit")}</button>
      <p className="hint">{t("draw.create.frozenHint")}</p>
    </form>
  );
}
