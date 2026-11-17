"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { api, copyText } from "@/lib/client";
import { CopyButton } from "@/components/CopyButton";

type Person = { id: string; name: string };
type DrawResult = { adminUrl: string; participantLinks: Array<{ participantId: string; name: string; url: string }>; emailAvailable: false };
const person = (): Person => ({ id: crypto.randomUUID(), name: "" });

export function DrawCreate() {
  const submitting = useRef(false);
  const requestId = useRef("");
  const [organizerId] = useState("organizer");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerParticipates, setOrganizerParticipates] = useState(true);
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [date, setDate] = useState("");
  const [others, setOthers] = useState<Person[]>([{ id: "participant-1", name: "" }, { id: "participant-2", name: "" }]);
  const [excludedPairs, setExcludedPairs] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<DrawResult>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const participants = useMemo(() => {
    const items = others.filter((item) => item.name.trim());
    return organizerParticipates && organizerName.trim()
      ? [{ id: organizerId, name: organizerName.trim() }, ...items]
      : items;
  }, [organizerId, organizerName, organizerParticipates, others]);
  const pairs = useMemo(() => participants.flatMap((left, leftIndex) => participants.slice(leftIndex + 1).map((right) => ({ left, right, key: [left.id, right.id].sort().join(":") }))), [participants]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setError(""); setBusy(true);
    try {
      const exclusions = pairs.filter((pair) => excludedPairs.has(pair.key)).flatMap((pair) => [{ from: pair.left.id, to: pair.right.id }, { from: pair.right.id, to: pair.left.id }]);
      setResult(await api<DrawResult>("/api/draws", { method: "POST", body: JSON.stringify({ requestId: requestId.current, organizerName, title, budget, date, participants, exclusions }) }));
    } catch (submitError) { setError((submitError as Error).message); }
    finally { setBusy(false); submitting.current = false; }
  };

  if (result) {
    return (
      <section className="tool-card" aria-live="polite">
        <span className="eyebrow">Trekking voltooid</span><h2>De persoonlijke links staan klaar.</h2>
        <div className="notice warning"><strong>Bewaar deze pagina totdat je alle links hebt gedeeld.</strong><span>Ruwe persoonlijke links worden niet in de database bewaard en zijn na verversen niet terug te halen. Via beheer kun je een verloren link vervangen.</span></div>
        <div className="link-result"><label>Jouw beheerlink</label><div className="link-box"><code>{result.adminUrl}</code><CopyButton value={result.adminUrl} label="Kopieer beheerlink" /></div></div>
        <h3>Deel één link per privébericht</h3>
        <ul className="result-list">
          {result.participantLinks.map((link) => {
            const message = `Hoi ${link.name}! We gaan lootjes trekken voor ${title || "onze groep"}. Via deze persoonlijke link zie je voor wie jij een cadeau koopt en kun je je eigen wensenlijstje maken: ${link.url}. Deel de link niet met anderen.`;
            return <li className="result-row" key={link.participantId}><div className="participant-name"><strong>{link.name}</strong><small>link beschikbaar</small></div><div className="button-row"><CopyButton value={message} label="Kopieer bericht" /><a className="button button-small" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Open WhatsApp</a></div></li>;
          })}
        </ul>
        <div className="notice"><strong>E-mail is niet ingeschakeld.</strong><span>Er is geen provider of afzender getest. De site claimt daarom geen verzending.</span></div>
        <div className="button-row"><a className="button" href={result.adminUrl}>Open trekkingbeheer</a><button className="button button-secondary" type="button" onClick={() => copyText(result.adminUrl)}>Bewaar beheerlink</button></div>
      </section>
    );
  }

  return (
    <form className="tool-card" onSubmit={submit}>
      <div className="step-heading"><span>1</span><h2>De gelegenheid</h2></div>
      <div className="field"><label htmlFor="organizer">Jouw naam *</label><input id="organizer" required maxLength={80} value={organizerName} onChange={(event) => setOrganizerName(event.target.value)} placeholder="Ludo" /></div>
      <label className="checkbox-label"><input type="checkbox" checked={organizerParticipates} onChange={(event) => setOrganizerParticipates(event.target.checked)} />Ik doe zelf mee met de trekking</label>
      <div className="field-row">
        <div className="field"><label htmlFor="draw-title">Groepsnaam <span className="hint">optioneel</span></label><input id="draw-title" maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Sinterklaas bij de familie" /></div>
        <div className="field"><label htmlFor="budget">Budget <span className="hint">optioneel</span></label><input id="budget" maxLength={40} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="€ 25" /></div>
      </div>
      <div className="field"><label htmlFor="draw-date">Datum <span className="hint">optioneel</span></label><input id="draw-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>

      <div className="step-heading"><span>2</span><h2>De deelnemers</h2></div>
      <p className="muted">Minimaal drie deelnemers. Dezelfde naam mag vaker voorkomen; elke rij blijft een eigen persoon.</p>
      <div className="participant-list">
        {others.map((item, index) => <div className="participant-row" key={item.id}><div className="field" style={{ margin: 0, flex: 1 }}><label htmlFor={`participant-${item.id}`}>Deelnemer {index + 1}</label><input id={`participant-${item.id}`} maxLength={80} value={item.name} onChange={(event) => setOthers(others.map((candidate) => candidate.id === item.id ? { ...candidate, name: event.target.value } : candidate))} placeholder="Naam" /></div>{others.length > 2 && <button aria-label={`Verwijder deelnemer ${index + 1}`} className="button button-danger icon-button" type="button" onClick={() => setOthers(others.filter((candidate) => candidate.id !== item.id))}>×</button>}</div>)}
      </div>
      <button className="button button-secondary" type="button" onClick={() => setOthers([...others, person()])}>+ Deelnemer toevoegen</button>

      <div className="step-heading"><span>3</span><h2>Wie mogen elkaar niet trekken?</h2></div>
      {pairs.length ? <div className="exclusion-grid">{pairs.map((pair) => <label className="exclusion-row" key={pair.key}><input type="checkbox" checked={excludedPairs.has(pair.key)} onChange={(event) => setExcludedPairs((current) => { const next = new Set(current); if (event.target.checked) next.add(pair.key); else next.delete(pair.key); return next; })} /><span><strong>{pair.left.name}</strong> en <strong>{pair.right.name}</strong> mogen elkaar niet trekken</span></label>)}</div> : <div className="empty-state">Vul eerst minimaal drie namen in.</div>}
      <p className="hint">Zelf trekken is altijd uitgesloten. Een gekozen paar wordt in beide richtingen uitgesloten.</p>
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className="button" disabled={busy || participants.length < 3} type="submit">{busy ? "Eerlijk verdelen…" : "Controleer en trek de lootjes"}</button>
      <p className="hint">De trekking is na deze actie bevroren. Iedere deelnemer kan daarna via de eigen link wensen toevoegen.</p>
    </form>
  );
}
