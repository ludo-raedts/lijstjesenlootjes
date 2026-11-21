"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { copyText, reportUsage } from "@/lib/client";

/**
 * The management link is the only key to a list or draw, so the result screen makes saving it a deliberate step:
 * copy it, send it to yourself (share sheet, or the mail app as fallback), or open the management page.
 * Until one of those happened (or a link mail was queued), leaving the page asks for confirmation.
 */
export function SaveManageLink({
  url,
  kind,
  mailQueued = false,
  copyLabel,
  openLabel,
}: {
  url: string;
  kind: "wishlist" | "draw";
  mailQueued?: boolean;
  copyLabel: string;
  openLabel: string;
}) {
  const { t } = useI18n();
  const saved = useRef(mailQueued);
  const [done, setDone] = useState(mailQueued);

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (saved.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);

  function markSaved() {
    if (saved.current) return;
    saved.current = true;
    setDone(true);
    reportUsage("manage_link_saved");
  }

  const subject = t(`saveLink.mailSubject.${kind}`);
  const body = t(`saveLink.mailBody.${kind}`, { url });

  return (
    <section className="save-link" aria-labelledby={`save-link-${kind}`}>
      <h3 id={`save-link-${kind}`}>{t("saveLink.title")}</h3>
      <p>{t(`saveLink.body.${kind}`)}</p>
      <div className="link-box">
        <code>{url}</code>
        <button
          className="button button-secondary button-small"
          type="button"
          onClick={async () => {
            await copyText(url);
            markSaved();
          }}
        >
          {copyLabel}
        </button>
      </div>
      <div className="button-row">
        <button
          className="button button-secondary"
          type="button"
          onClick={async () => {
            if (navigator.share) {
              try {
                await navigator.share({ title: subject, text: body });
                markSaved();
              } catch {
                // The person closed the share sheet without choosing anything: not saved yet.
              }
            } else {
              markSaved();
              window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }
          }}
        >
          {t("saveLink.sendToSelf")}
        </button>
        <a className="button" href={url} onClick={markSaved}>{openLabel}</a>
      </div>
      <p className="hint" role="status">{done ? t("saveLink.saved") : t("saveLink.unsaved")}</p>
    </section>
  );
}
