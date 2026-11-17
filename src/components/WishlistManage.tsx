"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ensureSession } from "@/lib/client";
import { WishDraft, WishFields } from "@/components/WishFields";

type Wishlist = { id: string; title: string; occasion?: string; date?: string; wishes: Array<WishDraft & { id: string }> };

export function WishlistManage() {
  const started = useRef(false);
  const [wishlist, setWishlist] = useState<Wishlist>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        await ensureSession();
        const result = await api<{ wishlist: Wishlist }>("/api/wishlists/manage");
        setWishlist({ ...result.wishlist, wishes: result.wishlist.wishes.map((wish) => ({ ...wish, url: wish.url ?? "", price: wish.price ?? "", note: wish.note ?? "" })) });
      } catch (loadError) {
        setError((loadError as Error).message);
      }
    })();
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!wishlist) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<{ wishlist: Wishlist }>("/api/wishlists/manage", { method: "PATCH", body: JSON.stringify(wishlist) });
      setWishlist({ ...result.wishlist, wishes: result.wishlist.wishes.map((wish) => ({ ...wish, url: wish.url ?? "", price: wish.price ?? "", note: wish.note ?? "" })) });
      setMessage("Je wijzigingen zijn opgeslagen.");
    } catch (saveError) { setError((saveError as Error).message); }
    finally { setBusy(false); }
  };

  if (!wishlist) return <div className="tool-card loading">{error ? <div className="notice error" role="alert">{error}</div> : "Beheerlink controleren…"}</div>;

  return (
    <form className="tool-card" onSubmit={save}>
      <span className="eyebrow">Beheer</span><h2>Je verlanglijstje</h2>
      <div className="notice"><strong>Reserveringen blijven verborgen in beheer.</strong><span>Open je zelf de gastenlink, dan kun je de gastweergave wel zien.</span></div>
      <div className="field"><label htmlFor="manage-title">Titel</label><input id="manage-title" value={wishlist.title} required onChange={(event) => setWishlist({ ...wishlist, title: event.target.value })} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="manage-occasion">Gelegenheid</label><input id="manage-occasion" value={wishlist.occasion ?? ""} onChange={(event) => setWishlist({ ...wishlist, occasion: event.target.value })} /></div>
        <div className="field"><label htmlFor="manage-date">Datum</label><input id="manage-date" type="date" value={wishlist.date ?? ""} onChange={(event) => setWishlist({ ...wishlist, date: event.target.value })} /></div>
      </div>
      <WishFields wishes={wishlist.wishes} onChange={(wishes) => setWishlist({ ...wishlist, wishes: wishes as Array<WishDraft & { id: string }> })} />
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice success" role="status">{message}</div>}
      <div className="button-row"><button className="button" disabled={busy} type="submit">{busy ? "Opslaan…" : "Wijzigingen opslaan"}</button><button className="button button-danger" type="button" onClick={async () => {
        if (!window.confirm("Dit verwijdert het hele lijstje en alle reserveringen. Dit kan niet ongedaan worden gemaakt. Doorgaan?")) return;
        try { await api("/api/wishlists/manage", { method: "DELETE", body: "{}" }); setWishlist(undefined); setError("Het verlanglijstje is verwijderd."); } catch (deleteError) { setError((deleteError as Error).message); }
      }}>Verwijder lijstje</button></div>
    </form>
  );
}
