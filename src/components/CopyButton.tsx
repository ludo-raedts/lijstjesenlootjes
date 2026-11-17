"use client";

import { useState } from "react";
import { copyText } from "@/lib/client";
import { useI18n } from "@/i18n/I18nProvider";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="button button-secondary button-small"
      type="button"
      onClick={async () => {
        await copyText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? t("common.copied") : (label ?? t("common.copy"))}
    </button>
  );
}
