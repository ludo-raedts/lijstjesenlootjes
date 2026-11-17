"use client";

import { useEffect, useRef, useState } from "react";
import { api, ensureSession } from "@/lib/client";
import { CopyButton } from "@/components/CopyButton";
import { getActiveLocale } from "@/i18n/config";
import { translateParticipantLinkStatus, type ParticipantLinkStatus } from "@/i18n/status";

type AdminDraw = { title?: string; organizerName: string; date?: string; budget?: string; participants: Array<{ id: string; name: string; status: ParticipantLinkStatus }> };

export function DrawAdmin() {
  const started = useRef(false);
  const [draw, setDraw] = useState<AdminDraw>();
  const [newLinks, setNewLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  useEffect(() => { if (started.current) return; started.current = true; (async () => { try { await ensureSession(); setDraw((await api<{ draw: AdminDraw }>("/api/draws/admin")).draw); } catch (loadError) { setError((loadError as Error).message); } })(); }, []);
  if (!draw) return <div className="tool-card loading">{error ? <div className="notice error" role="alert">{error}</div> : "Beheerlink controleren…"}</div>;
  return <section className="tool-card"><span className="eyebrow">Trekkingbeheer</span><h2>{draw.title || "Jullie trekking"}</h2><p className="muted">Georganiseerd door {draw.organizerName}{draw.budget ? ` · ${draw.budget}` : ""}</p><div className="notice warning"><strong>De verdeling blijft verborgen.</strong><span>Omdat alleen tokenhashes zijn opgeslagen, kun je oude persoonlijke links hier niet terugzien. Een verloren link kun je wel direct vervangen.</span></div>{error && <div className="notice error" role="alert">{error}</div>}<ul className="participant-list">{draw.participants.map((participant) => {
    const replacement = newLinks[participant.id];
    const message = replacement ? `Hoi ${participant.name}! Je persoonlijke lootjeslink is vervangen. Via deze link zie je voor wie jij een cadeau koopt: ${replacement}. Deel de link niet met anderen.` : "";
    return <li className="participant-row" key={participant.id}><div className="participant-name"><strong>{participant.name}</strong><small>{replacement ? "nieuwe link beschikbaar" : translateParticipantLinkStatus(participant.status, getActiveLocale())}</small>{replacement && <div className="link-box" style={{ marginTop: ".6rem" }}><code>{replacement}</code><CopyButton value={message} label="Kopieer bericht" /></div>}</div><button className="button button-secondary button-small" disabled={busyId === participant.id} type="button" onClick={async () => {
      if (!window.confirm(`De oude link van ${participant.name} wordt direct ongeldig. Nieuwe link maken?`)) return;
      setBusyId(participant.id); setError("");
      try { const result = await api<{ url: string }>("/api/draws/admin", { method: "POST", body: JSON.stringify({ action: "regenerate", participantId: participant.id }) }); setNewLinks((current) => ({ ...current, [participant.id]: result.url })); }
      catch (actionError) { setError((actionError as Error).message); }
      finally { setBusyId(""); }
    }}>{busyId === participant.id ? "Vervangen…" : "Vervang verloren link"}</button></li>;
  })}</ul><div className="notice"><strong>E-mail niet beschikbaar</strong><span>Persoonlijke links deel je handmatig via een privébericht.</span></div></section>;
}
