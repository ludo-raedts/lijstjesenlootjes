"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { api, copyText } from "@/lib/client";
import { CopyButton } from "@/components/CopyButton";
import { useI18n } from "@/i18n/I18nProvider";

type Person = { id: string; name: string };
type DrawResult = { adminUrl: string; participantLinks: Array<{ participantId: string; name: string; url: string }>; emailAvailable: false };
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
  const [others, setOthers] = useState<Person[]>([{ id: "participant-1", name: "" }, { id: "participant-2", name: "" }]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<DrawResult>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      setResult(await api<DrawResult>("/api/draws", { method: "POST", body: JSON.stringify({ requestId: requestId.current, organizerName, title, budget, date, participants, exclusions }) }));
    } catch (submitError) { setError((submitError as Error).message); }
    finally { setBusy(false); submitting.current = false; }
  };

  if (result) {
    return (
      <section className="tool-card" aria-live="polite">
        <span className="eyebrow">{t("draw.create.completeEyebrow")}</span><h2>{t("draw.create.completeTitle")}</h2>
        <div className="notice warning"><strong>{t("draw.create.keepPageTitle")}</strong><span>{t("draw.create.keepPageBody")}</span></div>
        <div className="link-result"><span className="field-label">{t("draw.create.adminLink")}</span><div className="link-box"><code>{result.adminUrl}</code><CopyButton value={result.adminUrl} label={t("draw.create.copyAdminLink")} /></div></div>
        <h3>{t("draw.create.shareHeading")}</h3>
        <ul className="result-list">
          {result.participantLinks.map((link) => {
            const message = t("draw.create.participantMessage", { name: link.name, group: title || t("draw.create.defaultGroup"), url: link.url });
            return <li className="result-row" key={link.participantId}><div className="participant-name"><strong>{link.name}</strong><small>{t("draw.create.linkAvailable")}</small></div><div className="button-row"><CopyButton value={message} label={t("draw.create.copyMessage")} /><a className="button button-small" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">{t("draw.create.openWhatsapp")}</a></div></li>;
          })}
        </ul>
        <div className="notice"><strong>{t("draw.create.emailTitle")}</strong><span>{t("draw.create.emailBody")}</span></div>
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

      <div className="step-heading"><span>2</span><h2>{t("draw.create.step2")}</h2></div>
      <p className="muted">{t("draw.create.participantsHint")}</p>
      <div className="participant-list">
        {others.map((item, index) => <div className="participant-row" key={item.id}><div className="field" style={{ margin: 0, flex: 1 }}><label htmlFor={`participant-${item.id}`}>{t("draw.create.participantLabel", { number: index + 1 })}</label><input id={`participant-${item.id}`} maxLength={80} value={item.name} onChange={(event) => setOthers(others.map((candidate) => candidate.id === item.id ? { ...candidate, name: event.target.value } : candidate))} placeholder={t("draw.create.namePlaceholder")} /></div>{others.length > 2 && <button aria-label={t("draw.create.removeParticipant", { number: index + 1 })} className="button button-danger icon-button" type="button" onClick={() => setOthers(others.filter((candidate) => candidate.id !== item.id))}>×</button>}</div>)}
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
