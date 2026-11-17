"use client";

import { useEffect, useRef, useState } from "react";
import { AmazonDisclosure, WishLink } from "@/components/AmazonAffiliate";
import { formattingLocales } from "@/i18n/config";
import { api, ensureSession, linkProblemCode } from "@/lib/client";
import type { ApiErrorCode } from "@/lib/api-error";
import { LinkProblem } from "@/components/LinkProblem";
import { useI18n } from "@/i18n/I18nProvider";

type GuestWishlist = { title: string; occasion?: string; date?: string; wishes: Array<{ id: string; title: string; url?: string; price?: string; note?: string; reserved: boolean; ownReservation: boolean }> };

export function WishlistGuest() {
  const { locale, t } = useI18n();
  const started = useRef(false);
  const [wishlist, setWishlist] = useState<GuestWishlist>();
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<ApiErrorCode>();
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    const result = await api<{ wishlist: GuestWishlist }>("/api/wishlists/guest");
    setWishlist(result.wishlist);
  };
  useEffect(() => { if (started.current) return; started.current = true; (async () => { try { await ensureSession(); await load(); } catch (loadError) { setError((loadError as Error).message); setErrorCode(linkProblemCode(loadError)); } })(); }, []);

  if (!wishlist) return <div className="tool-card loading">{errorCode ? <LinkProblem role="guest" code={errorCode} message={error} /> : error ? <div className="notice error" role="alert">{error}</div> : t("wishlist.guest.loading")}</div>;
  return (
    <section className="tool-card">
      <span className="eyebrow">{t("wishlist.guest.eyebrow")}</span><h2>{wishlist.title}</h2>
      {(wishlist.occasion || wishlist.date) && <p className="muted">{[wishlist.occasion, wishlist.date && new Intl.DateTimeFormat(formattingLocales[locale], { dateStyle: "long" }).format(new Date(`${wishlist.date}T12:00:00`))].filter(Boolean).join(" · ")}</p>}
      <div className="notice"><strong>{t("wishlist.guest.noticeTitle")}</strong><span>{t("wishlist.guest.noticeBody")}</span></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <ul className="gift-list">
        {wishlist.wishes.map((wish) => (
          <li className="gift-card" key={wish.id}>
            <div><span className={`availability ${wish.reserved ? "reserved" : ""}`}>{wish.reserved ? (wish.ownReservation ? t("wishlist.guest.reservedByYou") : t("wishlist.guest.reserved")) : t("wishlist.guest.available")}</span><h3>{wish.title}</h3>{wish.note && <p>{wish.note}</p>}<div className="gift-meta">{wish.price && <span>{wish.price}</span>}<WishLink url={wish.url} title={wish.title} /></div></div>
            {(!wish.reserved || wish.ownReservation) && <button className={wish.ownReservation ? "button button-secondary" : "button"} disabled={busyId === wish.id} type="button" onClick={async () => {
              setBusyId(wish.id); setError("");
              try { await api("/api/wishlists/guest", { method: "POST", body: JSON.stringify({ action: wish.ownReservation ? "release" : "reserve", wishId: wish.id }) }); await load(); }
              catch (actionError) { setError((actionError as Error).message); await load().catch(() => undefined); }
              finally { setBusyId(""); }
            }}>{busyId === wish.id ? t("wishlist.guest.waiting") : wish.ownReservation ? t("wishlist.guest.release") : t("wishlist.guest.reserve")}</button>}
          </li>
        ))}
      </ul>
      <AmazonDisclosure />
      <p className="hint">{t("wishlist.guest.sessionHint")}</p>
    </section>
  );
}
