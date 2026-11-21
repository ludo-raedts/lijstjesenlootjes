"use client";

import { useState } from "react";
import { copyText, reportUsage } from "@/lib/client";
import { useI18n } from "@/i18n/I18nProvider";

/** `track` counts the copy anonymously; use it only for links that are shared with other people. */
export function CopyButton({ value, label, track }: { value: string; label?: string; track?: boolean }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="button button-secondary button-small"
      type="button"
      onClick={async () => {
        await copyText(value);
        if (track) reportUsage("share_link_copied");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? t("common.copied") : (label ?? t("common.copy"))}
    </button>
  );
}
