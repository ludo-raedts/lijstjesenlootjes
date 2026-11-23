"use client";

import { FormEvent, useState } from "react";
import { api, copyText } from "@/lib/client";
import { AmazonDisclosure } from "@/components/AmazonAffiliate";
import { blankWish, WishDraft, WishFields } from "@/components/WishFields";
import { CopyButton } from "@/components/CopyButton";
import { SaveManageLink } from "@/components/SaveManageLink";
import { useI18n } from "@/i18n/I18nProvider";

type Result = { manageUrl: string; guestUrl: string; emailStatus: "not_requested" | "queued" | "failed" };

export function WishlistCreate() {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState("");
  const [date, setDate] = useState("");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [recoverable, setRecoverable] = useState(false);
  const [reservations, setReservations] = useState(true);
  const [wishes, setWishes] = useState<WishDraft[]>([blankWish()]);
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const created = await api<Result>("/api/wishlists", {
        method: "POST",
        body: JSON.stringify({ title, occasion, date, wishes, reservations, email, recoverable }),
      });
      setSentTo(email.trim());
      setResult(created);
    } catch (submissionError) {
      setError((submissionError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const shareText = t("wishlist.create.shareText", { url: result.guestUrl });
    return (
      <section className="tool-card" aria-live="polite">
        <span className="eyebrow">{t("wishlist.create.successEyebrow")}</span>
        <h2>{t("wishlist.create.successTitle")}</h2>
        <p>{t("wishlist.create.successIntro")}</p>
        {result.emailStatus === "queued" && <div className="notice" role="status"><strong>{t("email.result.queuedTitle")}</strong><span>{t("email.result.queuedBody", { email: sentTo })}</span></div>}
        {result.emailStatus === "failed" && <div className="notice error" role="alert"><strong>{t("email.result.failedTitle")}</strong><span>{t("email.result.failedBody")}</span></div>}
        <div className="notice warning"><strong>{t("wishlist.create.manageWarningTitle")}</strong><span>{t("wishlist.create.manageWarningBody")}</span></div>
        <SaveManageLink url={result.manageUrl} kind="wishlist" mailQueued={result.emailStatus === "queued"} copyLabel={t("wishlist.create.copyManage")} openLabel={t("wishlist.create.openManage")} />
        <div className="link-result">
          <span className="field-label">{t("wishlist.create.guestLink")}</span>
          <div className="link-box"><code>{result.guestUrl}</code><CopyButton track value={result.guestUrl} label={t("wishlist.create.copyGuest")} /></div>
        </div>
        <div className="button-row">
          <button className="button button-secondary" type="button" onClick={async () => {
            if (navigator.share) await navigator.share({ title: t("wishlist.create.shareTitle"), text: shareText });
            else await copyText(shareText);
          }}>{t("wishlist.create.share")}</button>
        </div>
        <p className="hint">{t("wishlist.create.guestHint")}</p>
      </section>
    );
  }

  return (
    <form className="tool-card" onSubmit={submit}>
      <div className="step-heading"><span>1</span><h2>{t("wishlist.create.step1")}</h2></div>
      <div className="field">
        <label htmlFor="list-title">{t("wishlist.create.titleLabel")}</label>
        <input id="list-title" value={title} maxLength={120} required onChange={(event) => setTitle(event.target.value)} placeholder={t("wishlist.create.titlePlaceholder")} />
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="occasion">{t("wishlist.create.occasionLabel")} <span className="hint">{t("common.optional")}</span></label><input id="occasion" value={occasion} maxLength={80} onChange={(event) => setOccasion(event.target.value)} placeholder={t("wishlist.create.occasionPlaceholder")} /></div>
        <div className="field"><label htmlFor="date">{t("wishlist.create.dateLabel")} <span className="hint">{t("common.optional")}</span></label><input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
      </div>
      <div className="step-heading"><span>2</span><h2>{t("wishlist.create.step2")}</h2></div>
      <p className="muted">{t("wishlist.create.wishesIntro")}</p>
      <WishFields wishes={wishes} onChange={setWishes} />
      <AmazonDisclosure />
      <div className="field"><label className="checkbox-label"><input type="checkbox" checked={reservations} onChange={(event) => setReservations(event.target.checked)} aria-describedby="reservations-hint" />{t("wishlist.create.reservationsLabel")}</label><p className="hint" id="reservations-hint">{t("wishlist.create.reservationsHint")}</p></div>
      <div className="field"><label htmlFor="email">{t("email.field.label")} <span className="hint">{t("common.optional")}</span></label><input id="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("email.field.placeholder")} aria-describedby="email-hint" /><p className="hint" id="email-hint">{t("email.field.wishlistHint")}</p>{email.trim() ? <><label className="checkbox-label"><input type="checkbox" checked={recoverable} onChange={(event) => setRecoverable(event.target.checked)} />{t("recover.optIn.label")}</label><p className="hint">{t("recover.optIn.hint")}</p></> : null}</div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <button className="button" disabled={busy} type="submit">{busy ? t("wishlist.create.submitting") : t("wishlist.create.submit")}</button>
    </form>
  );
}
