"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";

/** Fallback for an unexpected error inside a page; the header and footer stay, and the visitor can try again. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    // The digest matches the server log entry; the message itself can contain details and is not logged here.
    const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
    console.error("Page error", digest ?? "no-digest");
  }, [error]);
  return (
    <div className="shell narrow page-section center" role="alert">
      <span className="eyebrow">500</span>
      <h1>{t("error.title")}</h1>
      <p className="lead">{t("error.body")}</p>
      <button className="button" type="button" onClick={() => retry()}>{t("error.retry")}</button>
      <p><Link className="text-link" href="/">{t("notFound.action")}</Link></p>
    </div>
  );
}
