"use client";

import { useEffect, useRef, useState } from "react";
import { formattingLocales, getActiveLocale } from "@/i18n/config";
import { api, ensureSession } from "@/lib/client";

type GuestWishlist = { title: string; occasion?: string; date?: string; wishes: Array<{ id: string; title: string; url?: string; price?: string; note?: string; reserved: boolean; ownReservation: boolean }> };

export function WishlistGuest() {
  const started = useRef(false);
  const [wishlist, setWishlist] = useState<GuestWishlist>();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    const result = await api<{ wishlist: GuestWishlist }>("/api/wishlists/guest");
    setWishlist(result.wishlist);
  };
  useEffect(() => { if (started.current) return; started.current = true; (async () => { try { await ensureSession(); await load(); } catch (loadError) { setError((loadError as Error).message); } })(); }, []);

  if (!wishlist) return <div className="tool-card loading">{error ? <div className="notice error" role="alert">{error}</div> : "Gastenlink controleren…"}</div>;
  return (
    <section className="tool-card">
      <span className="eyebrow">Verlanglijstje</span><h2>{wishlist.title}</h2>
      {(wishlist.occasion || wishlist.date) && <p className="muted">{[wishlist.occasion, wishlist.date && new Intl.DateTimeFormat(formattingLocales[getActiveLocale()], { dateStyle: "long" }).format(new Date(`${wishlist.date}T12:00:00`))].filter(Boolean).join(" · ")}</p>}
      <div className="notice"><strong>Reserveren voorkomt dubbele cadeaus.</strong><span>Het betekent niet dat het cadeau al is gekocht. De maker ziet in de beheeromgeving niet wat is gereserveerd.</span></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <ul className="gift-list">
        {wishlist.wishes.map((wish) => (
          <li className="gift-card" key={wish.id}>
            <div><span className={`availability ${wish.reserved ? "reserved" : ""}`}>{wish.reserved ? (wish.ownReservation ? "Door jou gereserveerd" : "Gereserveerd") : "Beschikbaar"}</span><h3>{wish.title}</h3>{wish.note && <p>{wish.note}</p>}<div className="gift-meta">{wish.price && <span>{wish.price}</span>}{wish.url && <a href={wish.url} target="_blank" rel="noopener noreferrer nofollow">Bekijk link ↗</a>}</div></div>
            {(!wish.reserved || wish.ownReservation) && <button className={wish.ownReservation ? "button button-secondary" : "button"} disabled={busyId === wish.id} type="button" onClick={async () => {
              setBusyId(wish.id); setError("");
              try { await api("/api/wishlists/guest", { method: "POST", body: JSON.stringify({ action: wish.ownReservation ? "release" : "reserve", wishId: wish.id }) }); await load(); }
              catch (actionError) { setError((actionError as Error).message); await load().catch(() => undefined); }
              finally { setBusyId(""); }
            }}>{busyId === wish.id ? "Even wachten…" : wish.ownReservation ? "Maak weer beschikbaar" : "Ik geef dit cadeau"}</button>}
          </li>
        ))}
      </ul>
      <p className="hint">Je kunt je eigen reservering herstellen zolang je dezelfde browser en cookies gebruikt.</p>
    </section>
  );
}
