"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { buildAmazonSearchUrl, type AmazonLinkConfig } from "@/lib/affiliate/amazon";

const AmazonContext = createContext<AmazonLinkConfig | null>(null);

export function AmazonAffiliateProvider({ config, children }: { config: AmazonLinkConfig | null; children: ReactNode }) {
  return <AmazonContext.Provider value={config}>{children}</AmazonContext.Provider>;
}

export function useAmazonAffiliate() {
  return useContext(AmazonContext);
}

/** Deliberate "search on Amazon" action for a wish without its own link. Renders nothing when affiliate links are off. */
export function AmazonSearchLink({ title }: { title: string }) {
  const config = useAmazonAffiliate();
  const { t } = useI18n();
  const href = config ? buildAmazonSearchUrl(title, config) : null;
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      aria-label={t("affiliate.amazon.searchLabel", { title })}
    >
      {t("affiliate.amazon.search")}
    </a>
  );
}

/** Short disclosure shown next to a list that may contain commercial links. */
export function AmazonDisclosure() {
  const config = useAmazonAffiliate();
  const { t } = useI18n();
  if (!config) return null;
  return <p className="hint affiliate-disclosure">{t("affiliate.disclosure")}</p>;
}
