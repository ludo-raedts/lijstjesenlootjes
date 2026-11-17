"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ensureSession } from "@/lib/client";
import { WishDraft, WishFields } from "@/components/WishFields";
import { useI18n } from "@/i18n/I18nProvider";

type Wishlist = { id: string; title: string; occasion?: string; date?: string; wishes: Array<WishDraft & { id: string }> };

export function WishlistManage() {
  const { t } = useI18n();
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
      setMessage(t("wishlist.manage.saved"));
    } catch (saveError) { setError((saveError as Error).message); }
    finally { setBusy(false); }
  };

  if (!wishlist) return <div className="tool-card loading">{error ? <div className="notice error" role="alert">{error}</div> : t("wishlist.manage.loading")}</div>;

  return (
    <form className="tool-card" onSubmit={save}>
      <span className="eyebrow">{t("wishlist.manage.eyebrow")}</span><h2>{t("wishlist.manage.title")}</h2>
      <div className="notice"><strong>{t("wishlist.manage.reservationTitle")}</strong><span>{t("wishlist.manage.reservationBody")}</span></div>
      <div className="field"><label htmlFor="manage-title">{t("wishlist.manage.titleLabel")}</label><input id="manage-title" value={wishlist.title} required onChange={(event) => setWishlist({ ...wishlist, title: event.target.value })} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="manage-occasion">{t("wishlist.manage.occasionLabel")}</label><input id="manage-occasion" value={wishlist.occasion ?? ""} onChange={(event) => setWishlist({ ...wishlist, occasion: event.target.value })} /></div>
        <div className="field"><label htmlFor="manage-date">{t("wishlist.manage.dateLabel")}</label><input id="manage-date" type="date" value={wishlist.date ?? ""} onChange={(event) => setWishlist({ ...wishlist, date: event.target.value })} /></div>
      </div>
      <WishFields wishes={wishlist.wishes} onChange={(wishes) => setWishlist({ ...wishlist, wishes: wishes as Array<WishDraft & { id: string }> })} />
      {error && <div className="notice error" role="alert">{error}</div>}
      {message && <div className="notice success" role="status">{message}</div>}
      <div className="button-row"><button className="button" disabled={busy} type="submit">{busy ? t("wishlist.manage.saving") : t("wishlist.manage.save")}</button><button className="button button-danger" type="button" onClick={async () => {
        if (!window.confirm(t("wishlist.manage.deleteConfirm"))) return;
        try { await api("/api/wishlists/manage", { method: "DELETE", body: "{}" }); setWishlist(undefined); setError(t("wishlist.manage.deleted")); } catch (deleteError) { setError((deleteError as Error).message); }
      }}>{t("wishlist.manage.delete")}</button></div>
    </form>
  );
}
