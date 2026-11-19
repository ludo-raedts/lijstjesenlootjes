"use client";

import { useEffect, useSyncExternalStore } from "react";
import { normalizeLocale, type Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/messages";

/** Last resort when the root layout itself fails: no styles, header or provider, so keep it small and self-contained. */
function detectLocale(): Locale {
  const cookie = document.cookie.split("; ").find((part) => part.startsWith("ll_locale="))?.split("=")[1];
  if (cookie) return normalizeLocale(cookie);
  if (location.hostname.endsWith("wishanddraw.com")) return "en";
  return normalizeLocale(navigator.language);
}

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  // Server snapshot "nl" keeps hydration consistent; the browser then reads the visitor's own language.
  const locale = useSyncExternalStore(() => () => {}, detectLocale, () => "nl" as Locale);
  useEffect(() => {
    const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
    console.error("Global error", digest ?? "no-digest");
  }, [error]);
  const t = createTranslator(locale);
  return (
    <html lang={locale}>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#1d2a22", background: "#fbf6ec" }}>
        <main role="alert" style={{ maxWidth: "36rem", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
          <h1>{t("error.title")}</h1>
          <p>{t("error.body")}</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ padding: ".8rem 1.4rem", border: 0, borderRadius: 8, background: "#1f3a56", color: "#fff", font: "inherit", cursor: "pointer" }}
          >
            {t("error.retry")}
          </button>
        </main>
      </body>
    </html>
  );
}
