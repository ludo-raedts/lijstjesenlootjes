"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { AmazonDisclosure, WishLink } from "@/components/AmazonAffiliate";
import { MakeOwnList } from "@/components/MakeOwnList";
import { WishFields, blankWish, type WishDraft } from "@/components/WishFields";
import { formattingLocales } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ensureSession, linkProblemCode } from "@/lib/client";
import type { ApiErrorCode } from "@/lib/api-error";
import { LinkProblem } from "@/components/LinkProblem";

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
  linkedWishlist?: { title: string; wishCount: number } | { missing: true };
  note?: string;
  redrawnAt?: string;
};

type Reveal = {
  recipientName: string;
  title?: string;
  budget?: string;
  date?: string;
  note?: string;
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
  const { t } = useI18n();
  return (
    <section className="draw-wishlist recipient-wishlist" aria-labelledby="recipient-wishlist-title">
      <div className="draw-wishlist-heading">
        <span className="eyebrow">{t("draw.reveal.tipsEyebrow")}</span>
        <h3 id="recipient-wishlist-title">{t("draw.reveal.recipientWishlist", { name: reveal.recipientName })}</h3>
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
                  <WishLink url={wish.url} title={wish.title} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-wishlist">{t("draw.reveal.emptyWishlist", { name: reveal.recipientName })}</p>
      )}
      <AmazonDisclosure />
      <p className="hint">{t("draw.reveal.noReservations")}</p>
      <button className="button button-secondary button-small" disabled={refreshing} type="button" onClick={onRefresh}>
        {refreshing ? t("draw.reveal.refreshing") : t("draw.reveal.refresh")}
      </button>
      <MakeOwnList source="reveal" />
    </section>
  );
}

export function DrawReveal() {
  const { locale, t } = useI18n();
  const started = useRef(false);
  const [draw, setDraw] = useState<NeutralDraw>();
  const [reveal, setReveal] = useState<Reveal>();
  const [wishes, setWishes] = useState<WishDraft[]>([blankWish()]);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<ApiErrorCode>();
  const [linkInput, setLinkInput] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
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
        setErrorCode(linkProblemCode(loadError));
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
      setSaveMessage(t("draw.reveal.saved"));
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaveBusy(false);
    }
  }

  async function changeLink(action: "link_wishlist" | "unlink_wishlist") {
    setLinkBusy(true);
    setError("");
    try {
      const result = await api<{ linkedWishlist?: { title: string; wishCount: number } }>("/api/draws/participant", {
        method: "PUT",
        body: JSON.stringify({ action, link: linkInput }),
      });
      setDraw((current) => current && { ...current, linkedWishlist: result.linkedWishlist });
      setLinkInput("");
    } catch (linkError) {
      setError((linkError as Error).message);
    } finally {
      setLinkBusy(false);
    }
  }

  if (!draw) {
    return (
      <div className="reveal-card loading">
        {errorCode ? <LinkProblem role="participant" code={errorCode} message={error} /> : error ? <div className="notice error" role="alert">{error}</div> : t("draw.reveal.loading")}
      </div>
    );
  }

  return (
    <section className="reveal-card draw-reveal-card">
      <div className="seal" aria-hidden="true">✦</div>
      <span className="eyebrow">{t("draw.reveal.eyebrow")}</span>
      <h2>{t("draw.reveal.hello", { name: draw.giverName })}</h2>

      {!reveal ? (
        <div className="reveal-intro">
          <p>{t("draw.reveal.intro", { group: draw.title || t("draw.reveal.defaultGroup") })}</p>
          {draw.revealedBefore ? <p className="hint">{t("draw.reveal.viewedBefore")}</p> : null}
          {draw.redrawnAt ? <div className="notice warning" role="status">{t("draw.reveal.redrawn", { date: new Intl.DateTimeFormat(formattingLocales[locale], { dateStyle: "long" }).format(new Date(draw.redrawnAt)) })}</div> : null}
          {draw.note ? <div className="notice"><strong>{t("draw.reveal.noteTitle")}</strong><span className="draw-note">{draw.note}</span></div> : null}
          <button className="button" disabled={revealBusy} type="button" onClick={revealDraw}>
            {revealBusy ? t("draw.reveal.opening") : t("draw.reveal.open")}
          </button>
        </div>
      ) : (
        <div className="draw-reveal-content">
          <div className="assignment-panel" aria-live="polite">
            <p>{t("draw.reveal.assignment")}</p>
            <p className="recipient-name">{reveal.recipientName}</p>
            {reveal.budget || reveal.date ? (
              <p className="muted">
                {[
                  reveal.budget ? t("draw.reveal.budget", { budget: reveal.budget }) : undefined,
                  reveal.date ? new Intl.DateTimeFormat(formattingLocales[locale], { dateStyle: "long" }).format(new Date(`${reveal.date}T12:00:00`)) : undefined,
                ].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <p className="hint">{t("draw.reveal.privateHint")}</p>
          </div>

          <RecipientWishlist reveal={reveal} refreshing={revealBusy} onRefresh={revealDraw} />

          <form className="draw-wishlist own-wishlist" onSubmit={saveWishlist}>
            <div className="draw-wishlist-heading">
              <span className="eyebrow">{t("draw.reveal.ownEyebrow")}</span>
              <h3>{t("draw.reveal.ownTitle")}</h3>
              <p>{t("draw.reveal.ownBody")}</p>
            </div>
            <WishFields wishes={wishes} onChange={setWishes} />
            <button className="button" disabled={saveBusy} type="submit">
              {saveBusy ? t("draw.reveal.saving") : t("draw.reveal.save")}
            </button>
            {saveMessage ? <div className="notice success" role="status">{saveMessage}</div> : null}
          </form>

          <section className="draw-wishlist link-wishlist" aria-labelledby="link-wishlist-title">
            <div className="draw-wishlist-heading">
              <h3 id="link-wishlist-title">{t("draw.reveal.linkTitle")}</h3>
              <p>{t("draw.reveal.linkBody")}</p>
            </div>
            {draw.linkedWishlist && "missing" in draw.linkedWishlist ? (
              <div className="notice warning" role="status">
                <span>{t("draw.reveal.linkedMissing")}</span>
                <button className="button button-secondary button-small" disabled={linkBusy} type="button" onClick={() => void changeLink("unlink_wishlist")}>{t("draw.reveal.unlink")}</button>
              </div>
            ) : draw.linkedWishlist ? (
              <div className="linked-wishlist">
                <p role="status"><strong>{t("draw.reveal.linked", { title: draw.linkedWishlist.title })}</strong></p>
                <button className="button button-secondary button-small" disabled={linkBusy} type="button" onClick={() => void changeLink("unlink_wishlist")}>
                  {t("draw.reveal.unlink")}
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void changeLink("link_wishlist"); }}>
                <div className="field">
                  <label htmlFor="link-wishlist-input">{t("draw.reveal.linkLabel")}</label>
                  <input id="link-wishlist-input" required value={linkInput} onChange={(event) => setLinkInput(event.target.value)} autoComplete="off" spellCheck={false} />
                </div>
                <button className="button button-secondary" disabled={linkBusy || !linkInput.trim()} type="submit">
                  {linkBusy ? t("draw.reveal.linking") : t("draw.reveal.linkSubmit")}
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {error ? <div className="notice error" role="alert">{error}</div> : null}
    </section>
  );
}
