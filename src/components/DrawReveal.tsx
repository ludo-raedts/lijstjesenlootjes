"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { WishFields, blankWish, type WishDraft } from "@/components/WishFields";
import { formattingLocales, getActiveLocale } from "@/i18n/config";
import { api, ensureSession } from "@/lib/client";

type DrawWish = {
  id: string;
  title: string;
  url?: string;
  price?: string;
  note?: string;
};

type NeutralDraw = {
  title?: string;
  giverName: string;
  budget?: string;
  date?: string;
  revealedBefore: boolean;
  ownWishes: DrawWish[];
};

type Reveal = {
  recipientName: string;
  title?: string;
  budget?: string;
  date?: string;
  recipientWishes: DrawWish[];
};

function toDraft(wish: DrawWish): WishDraft {
  return {
    ...wish,
    url: wish.url ?? "",
    price: wish.price ?? "",
    note: wish.note ?? "",
  };
}

function RecipientWishlist({
  reveal,
  refreshing,
  onRefresh,
}: {
  reveal: Reveal;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="draw-wishlist recipient-wishlist" aria-labelledby="recipient-wishlist-title">
      <div className="draw-wishlist-heading">
        <span className="eyebrow">Cadeautips</span>
        <h3 id="recipient-wishlist-title">Het lijstje van {reveal.recipientName}</h3>
      </div>
      {reveal.recipientWishes.length > 0 ? (
        <ul className="gift-list draw-gift-list">
          {reveal.recipientWishes.map((wish) => (
            <li className="gift-card" key={wish.id}>
              <div>
                <strong>{wish.title}</strong>
                {wish.note ? <p>{wish.note}</p> : null}
                <div className="gift-meta">
                  {wish.price ? <span>{wish.price}</span> : null}
                  {wish.url ? <a href={wish.url} target="_blank" rel="noopener noreferrer nofollow">Bekijk link ↗</a> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-wishlist">{reveal.recipientName} heeft nog geen wensen toegevoegd. Kijk later nog eens via dezelfde link.</p>
      )}
      <p className="hint">Op dit lijstje wordt niets gereserveerd; alleen jij ziet het via je persoonlijke lootjeslink.</p>
      <button className="button button-secondary button-small" disabled={refreshing} type="button" onClick={onRefresh}>
        {refreshing ? "Lijstje verversen…" : "Ververs dit lijstje"}
      </button>
    </section>
  );
}

export function DrawReveal() {
  const started = useRef(false);
  const [draw, setDraw] = useState<NeutralDraw>();
  const [reveal, setReveal] = useState<Reveal>();
  const [wishes, setWishes] = useState<WishDraft[]>([blankWish()]);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [revealBusy, setRevealBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function load() {
      try {
        await ensureSession();
        const result = await api<{ draw: NeutralDraw }>("/api/draws/participant");
        setDraw(result.draw);
        setWishes(result.draw.ownWishes.length > 0 ? result.draw.ownWishes.map(toDraft) : [blankWish()]);
      } catch (loadError) {
        setError((loadError as Error).message);
      }
    }

    void load();
  }, []);

  async function revealDraw() {
    setRevealBusy(true);
    setError("");
    try {
      setReveal(await api<Reveal>("/api/draws/participant", { method: "POST", body: "{}" }));
    } catch (revealError) {
      setError((revealError as Error).message);
    } finally {
      setRevealBusy(false);
    }
  }

  async function saveWishlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveBusy(true);
    setError("");
    setSaveMessage("");
    try {
      const result = await api<{ wishes: DrawWish[] }>("/api/draws/participant", {
        method: "PATCH",
        body: JSON.stringify({ wishes }),
      });
      setWishes(result.wishes.map(toDraft));
      setSaveMessage("Je lijstje is bewaard voor degene die jou heeft getrokken.");
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaveBusy(false);
    }
  }

  if (!draw) {
    return (
      <div className="reveal-card loading">
        {error ? <div className="notice error" role="alert">{error}</div> : "Persoonlijke link controleren…"}
      </div>
    );
  }

  return (
    <section className="reveal-card draw-reveal-card">
      <div className="seal" aria-hidden="true">✦</div>
      <span className="eyebrow">Persoonlijk lootje</span>
      <h2>Hoi {draw.giverName}</h2>

      {!reveal ? (
        <div className="reveal-intro">
          <p>Je lootje voor <strong>{draw.title || "jullie groep"}</strong> staat klaar. De naam verschijnt pas nadat je het bewust opent.</p>
          {draw.revealedBefore ? <p className="hint">Je hebt dit lootje eerder bekeken.</p> : null}
          <button className="button" disabled={revealBusy} type="button" onClick={revealDraw}>
            {revealBusy ? "Lootje openen…" : "Bekijk mijn lootje"}
          </button>
        </div>
      ) : (
        <div className="draw-reveal-content">
          <div className="assignment-panel" aria-live="polite">
            <p>Jij koopt een cadeau voor</p>
            <p className="recipient-name">{reveal.recipientName}</p>
            {reveal.budget || reveal.date ? (
              <p className="muted">
                {[
                  reveal.budget ? `Budget ${reveal.budget}` : undefined,
                  reveal.date ? new Intl.DateTimeFormat(formattingLocales[getActiveLocale()], { dateStyle: "long" }).format(new Date(`${reveal.date}T12:00:00`)) : undefined,
                ].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <p className="hint">Bewaar deze persoonlijke link privé.</p>
          </div>

          <RecipientWishlist reveal={reveal} refreshing={revealBusy} onRefresh={revealDraw} />

          <form className="draw-wishlist own-wishlist" onSubmit={saveWishlist}>
            <div className="draw-wishlist-heading">
              <span className="eyebrow">Jouw eigen lijstje</span>
              <h3>Wat zou jij graag krijgen?</h3>
              <p>Degene die jou heeft getrokken ziet dit bij diens lootje. Er zijn geen reserveringen.</p>
            </div>
            <WishFields wishes={wishes} onChange={setWishes} />
            <button className="button" disabled={saveBusy} type="submit">
              {saveBusy ? "Lijstje bewaren…" : "Bewaar mijn lijstje"}
            </button>
            {saveMessage ? <div className="notice success" role="status">{saveMessage}</div> : null}
          </form>
        </div>
      )}

      {error ? <div className="notice error" role="alert">{error}</div> : null}
    </section>
  );
}
