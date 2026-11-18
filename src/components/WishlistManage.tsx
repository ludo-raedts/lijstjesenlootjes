"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, ensureSession, linkProblemCode } from "@/lib/client";
import type { ApiErrorCode } from "@/lib/api-error";
import { CopyButton } from "@/components/CopyButton";
import { LinkProblem } from "@/components/LinkProblem";
import { MailPanel, type MailStatus } from "@/components/MailPanel";
import { WishDraft, WishFields } from "@/components/WishFields";
import { formattingLocales } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

type Wishlist = {
  id: string;
  title: string;
  occasion?: string;
  date?: string;
  expiresAt?: string;
  emailStatus?: MailStatus;
  recoverable?: boolean;
  managers?: Array<{ id: string; label?: string; createdAt: string }>;
  wishes: Array<WishDraft & { id: string }>;
};
type ManageResponse = { wishlist: Wishlist; emailAvailable?: boolean };

export function WishlistManage() {
  const { locale, t } = useI18n();
  const started = useRef(false);
  const [errorCode, setErrorCode] = useState<ApiErrorCode>();
  const [managerLabel, setManagerLabel] = useState("");
  const [managerBusy, setManagerBusy] = useState(false);
  const [newManagerUrl, setNewManagerUrl] = useState("");
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [wishlist, setWishlist] = useState<Wishlist>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        await ensureSession();
        const result = await api<ManageResponse>("/api/wishlists/manage");
        setEmailAvailable(Boolean(result.emailAvailable));
        setWishlist({ ...result.wishlist, wishes: result.wishlist.wishes.map((wish) => ({ ...wish, url: wish.url ?? "", price: wish.price ?? "", note: wish.note ?? "" })) });
      } catch (loadError) {
        setError((loadError as Error).message);
        setErrorCode(linkProblemCode(loadError));
      }
    })();
  }, []);

  // Refreshes only the mail and expiry details, so unsaved edits in the form are never overwritten.
  const refreshMeta = useCallback(async () => {
    const result = await api<ManageResponse>("/api/wishlists/manage");
    setEmailAvailable(Boolean(result.emailAvailable));
    setWishlist((current) => current && { ...current, emailStatus: result.wishlist.emailStatus, recoverable: result.wishlist.recoverable, expiresAt: result.wishlist.expiresAt, managers: result.wishlist.managers });
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

  async function manager(body: Record<string, unknown>) {
    setManagerBusy(true);
    setError("");
    try {
      const result = await api<{ manageUrl?: string; managers: NonNullable<Wishlist["managers"]> }>("/api/wishlists/manage", { method: "POST", body: JSON.stringify(body) });
      setWishlist((current) => current && { ...current, managers: result.managers });
      setNewManagerUrl(result.manageUrl ?? "");
      if (result.manageUrl) setManagerLabel("");
    } catch (managerError) {
      setError((managerError as Error).message);
    } finally {
      setManagerBusy(false);
    }
  }

  if (deleted) return <div className="tool-card"><div className="notice success" role="status">{t("wishlist.manage.deleted")}</div></div>;
  if (!wishlist) {
    return (
      <div className="tool-card loading">
        {errorCode ? <LinkProblem role="organizer" code={errorCode} message={error} /> : error ? <div className="notice error" role="alert">{error}</div> : t("wishlist.manage.loading")}
      </div>
    );
  }

  return (
    <div className="manage-stack">
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
      <div className="button-row"><button className="button" disabled={busy} type="submit">{busy ? t("wishlist.manage.saving") : t("wishlist.manage.save")}</button><button className="button button-danger" disabled={busy} type="button" onClick={async () => {
        if (!window.confirm(t("wishlist.manage.deleteConfirm"))) return;
        setBusy(true); setError(""); setMessage("");
        try { await api("/api/wishlists/manage", { method: "DELETE", body: "{}" }); setDeleted(true); } catch (deleteError) { setError((deleteError as Error).message); }
        finally { setBusy(false); }
      }}>{t("wishlist.manage.delete")}</button></div>
    </form>
    <section className="tool-card">
      {wishlist.expiresAt ? <p className="muted">{t("expiry.until", { date: new Intl.DateTimeFormat(formattingLocales[locale], { dateStyle: "long" }).format(new Date(wishlist.expiresAt)) })}</p> : null}
      <section className="admin-block" aria-labelledby="managers-title">
        <h3 id="managers-title">{t("wishlist.manage.managersTitle")}</h3>
        <p className="hint">{t("wishlist.manage.managersBody")}</p>
        {newManagerUrl ? (
          <div className="notice success" role="status">
            <span>{t("wishlist.manage.managerNew")}</span>
            <div className="link-box"><code>{newManagerUrl}</code><CopyButton value={newManagerUrl} label={t("wishlist.manage.managerCopy")} /></div>
          </div>
        ) : null}
        <ul className="participant-list">
          {(wishlist.managers ?? []).map((entry) => (
            <li className="participant-row" key={entry.id}>
              <div className="participant-name">
                <strong>{entry.label || t("wishlist.manage.managerUnnamed")}</strong>
                <small>{t("wishlist.manage.managerCreated", { date: new Intl.DateTimeFormat(formattingLocales[locale], { dateStyle: "long" }).format(new Date(entry.createdAt)) })}</small>
              </div>
              <button className="button button-secondary button-small" disabled={managerBusy} type="button" onClick={() => {
                if (window.confirm(t("wishlist.manage.managerRevokeConfirm"))) void manager({ action: "revoke_manager", managerId: entry.id });
              }}>{t("wishlist.manage.managerRevoke")}</button>
            </li>
          ))}
        </ul>
        <form className="inline-form" onSubmit={(event) => { event.preventDefault(); void manager({ action: "add_manager", label: managerLabel }); }}>
          <div className="field">
            <label htmlFor="manager-label">{t("wishlist.manage.managerLabel")}</label>
            <input id="manager-label" maxLength={60} value={managerLabel} onChange={(event) => setManagerLabel(event.target.value)} />
          </div>
          <button className="button button-secondary" disabled={managerBusy} type="submit">{managerBusy ? t("wishlist.manage.managerCreating") : t("wishlist.manage.managerCreate")}</button>
        </form>
      </section>
      <MailPanel endpoint="/api/wishlists/manage" status={wishlist.emailStatus} recoverable={Boolean(wishlist.recoverable)} emailAvailable={emailAvailable} onRefresh={refreshMeta} />
    </section>
    </div>
  );
}
