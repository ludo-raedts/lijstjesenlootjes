"use client";

import { useEffect, useRef, useState } from "react";
import { api, ensureSession } from "@/lib/client";
import { CopyButton } from "@/components/CopyButton";
import { useI18n } from "@/i18n/I18nProvider";
import { translateParticipantLinkStatus, type ParticipantLinkStatus } from "@/i18n/status";

type AdminDraw = { title?: string; organizerName: string; date?: string; budget?: string; participants: Array<{ id: string; name: string; status: ParticipantLinkStatus }> };

export function DrawAdmin() {
  const { locale, t } = useI18n();
  const started = useRef(false);
  const [draw, setDraw] = useState<AdminDraw>();
  const [newLinks, setNewLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  useEffect(() => { if (started.current) return; started.current = true; (async () => { try { await ensureSession(); setDraw((await api<{ draw: AdminDraw }>("/api/draws/admin")).draw); } catch (loadError) { setError((loadError as Error).message); } })(); }, []);
  if (!draw) return <div className="tool-card loading">{error ? <div className="notice error" role="alert">{error}</div> : t("draw.admin.loading")}</div>;
  return <section className="tool-card"><span className="eyebrow">{t("draw.admin.eyebrow")}</span><h2>{draw.title || t("draw.admin.defaultTitle")}</h2><p className="muted">{t("draw.admin.organizedBy", { name: draw.organizerName })}{draw.budget ? ` · ${draw.budget}` : ""}</p><div className="notice warning"><strong>{t("draw.admin.hiddenTitle")}</strong><span>{t("draw.admin.hiddenBody")}</span></div>{error && <div className="notice error" role="alert">{error}</div>}<ul className="participant-list">{draw.participants.map((participant) => {
    const replacement = newLinks[participant.id];
    const message = replacement ? t("draw.admin.replacementMessage", { name: participant.name, url: replacement }) : "";
    return <li className="participant-row" key={participant.id}><div className="participant-name"><strong>{participant.name}</strong><small>{replacement ? t("draw.admin.newLinkAvailable") : translateParticipantLinkStatus(participant.status, locale)}</small>{replacement && <div className="link-box" style={{ marginTop: ".6rem" }}><code>{replacement}</code><CopyButton value={message} label={t("draw.admin.copyMessage")} /></div>}</div><button className="button button-secondary button-small" disabled={busyId === participant.id} type="button" onClick={async () => {
      if (!window.confirm(t("draw.admin.confirmReplace", { name: participant.name }))) return;
      setBusyId(participant.id); setError("");
      try { const result = await api<{ url: string }>("/api/draws/admin", { method: "POST", body: JSON.stringify({ action: "regenerate", participantId: participant.id }) }); setNewLinks((current) => ({ ...current, [participant.id]: result.url })); }
      catch (actionError) { setError((actionError as Error).message); }
      finally { setBusyId(""); }
    }}>{busyId === participant.id ? t("draw.admin.replacing") : t("draw.admin.replace")}</button></li>;
  })}</ul><div className="notice"><strong>{t("draw.admin.emailTitle")}</strong><span>{t("draw.admin.emailBody")}</span></div></section>;
}
