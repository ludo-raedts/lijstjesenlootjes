"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { buildAmazonSearchUrl, tagAmazonUrl, type AmazonLinkConfig } from "@/lib/affiliate/amazon";

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

/**
 * The "view link" action for a wish. A user-entered amazon.com link is tagged at display
 * time (the stored URL is untouched); other links stay as entered. Wishes without a link
 * get the deliberate Amazon search action.
 */
export function WishLink({ url, title }: { url?: string; title: string }) {
  const config = useAmazonAffiliate();
  const { t } = useI18n();
  if (!url) return <AmazonSearchLink title={title} />;
  const tagged = config ? tagAmazonUrl(url, config) : null;
  if (tagged) {
    return <a href={tagged} target="_blank" rel="sponsored nofollow noopener noreferrer">{t("common.viewLink")}</a>;
  }
  return <a href={url} target="_blank" rel="noopener noreferrer nofollow">{t("common.viewLink")}</a>;
}

/** Helper in the wish editor: search Amazon for the typed title, then paste the chosen link back. */
export function AmazonEditorHelper({ title }: { title: string }) {
  const config = useAmazonAffiliate();
  const { t } = useI18n();
  const href = config ? buildAmazonSearchUrl(title, config) : null;
  if (!config) return null;
  return (
    <p className="hint amazon-helper">
      {href ? (
        <a href={href} target="_blank" rel="sponsored nofollow noopener noreferrer" aria-label={t("affiliate.amazon.searchLabel", { title })}>
          {t("affiliate.amazon.search")}
        </a>
      ) : (
        <span>{t("affiliate.amazon.helperEmpty")}</span>
      )}
      {href ? <span> {t("affiliate.amazon.helperHint")}</span> : null}
    </p>
  );
}

/** Short disclosure shown next to a list that may contain commercial links. */
export function AmazonDisclosure() {
  const config = useAmazonAffiliate();
  const { t } = useI18n();
  if (!config) return null;
  return <p className="hint affiliate-disclosure">{t("affiliate.disclosure")}</p>;
}
