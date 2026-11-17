"use client";

import { useState } from "react";
import { copyText } from "@/lib/client";

export function CopyButton({ value, label = "Kopieer" }: { value: string; label?: string }) {
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
      {copied ? "Gekopieerd" : label}
    </button>
  );
}
