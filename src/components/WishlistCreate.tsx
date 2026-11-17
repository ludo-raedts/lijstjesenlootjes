"use client";

import { FormEvent, useState } from "react";
import { api, copyText } from "@/lib/client";
import { blankWish, WishDraft, WishFields } from "@/components/WishFields";
import { CopyButton } from "@/components/CopyButton";

type Result = { manageUrl: string; guestUrl: string };

export function WishlistCreate() {
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState("");
  const [date, setDate] = useState("");
  const [wishes, setWishes] = useState<WishDraft[]>([blankWish()]);
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      setResult(await api<Result>("/api/wishlists", {
        method: "POST",
        body: JSON.stringify({ title, occasion, date, wishes }),
      }));
    } catch (submissionError) {
      setError((submissionError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const shareText = `Hoi! Ik heb mijn verlanglijstje gemaakt. Je vindt het hier: ${result.guestUrl}. Je kunt daar ook aangeven wat je wilt geven.`;
    return (
      <section className="tool-card" aria-live="polite">
        <span className="eyebrow">Gelukt</span>
        <h2>Je lijstje staat klaar.</h2>
        <p>Je krijgt twee verschillende links. Bewaar je beheerlink goed; daarmee kun je je wensen aanpassen.</p>
        <div className="notice warning"><strong>De beheerlink is alleen voor jou.</strong><span>Zonder deze link is er in de testversie geen herstel via e-mail.</span></div>
        <div className="link-result">
          <label>Beheerlink</label>
          <div className="link-box"><code>{result.manageUrl}</code><CopyButton value={result.manageUrl} label="Kopieer beheerlink" /></div>
        </div>
        <div className="link-result">
          <label>Gastenlink</label>
          <div className="link-box"><code>{result.guestUrl}</code><CopyButton value={result.guestUrl} label="Kopieer gastenlink" /></div>
        </div>
        <div className="button-row">
          <a className="button" href={result.manageUrl}>Open beheer</a>
          <button className="button button-secondary" type="button" onClick={async () => {
            if (navigator.share) await navigator.share({ title: "Mijn verlanglijstje", text: shareText });
            else await copyText(shareText);
          }}>Deel met gasten</button>
        </div>
        <p className="hint">Iedereen met de gastenlink kan het lijstje bekijken. De maker kan de gastenlink ook zelf openen en daardoor reserveringen zien.</p>
      </section>
    );
  }

  return (
    <form className="tool-card" onSubmit={submit}>
      <div className="step-heading"><span>1</span><h2>Over je lijstje</h2></div>
      <div className="field">
        <label htmlFor="list-title">Naam van je lijstje *</label>
        <input id="list-title" value={title} maxLength={120} required onChange={(event) => setTitle(event.target.value)} placeholder="Verlanglijstje van Ludo" />
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="occasion">Gelegenheid <span className="hint">optioneel</span></label><input id="occasion" value={occasion} maxLength={80} onChange={(event) => setOccasion(event.target.value)} placeholder="Verjaardag" /></div>
        <div className="field"><label htmlFor="date">Datum <span className="hint">optioneel</span></label><input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
      </div>
      <div className="step-heading"><span>2</span><h2>Je wensen</h2></div>
      <p className="muted">Een eigen omschrijving is genoeg. Een link naar een winkel is optioneel.</p>
      <WishFields wishes={wishes} onChange={setWishes} />
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className="button" disabled={busy} type="submit">{busy ? "Lijstje maken…" : "Maak mijn verlanglijstje"}</button>
      <p className="hint">Gebruik in deze besloten proefversie voorlopig alleen verzonnen gegevens.</p>
    </form>
  );
}
