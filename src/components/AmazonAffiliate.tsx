"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { buildAmazonSearchUrl, tagAmazonUrl, type AmazonLinkConfig } from "@/lib/affiliate/amazon";
import { disclosureKey } from "@/lib/affiliate/disclosure";
import { buildBolSearchUrl, wrapBolUrl, type BolLinkConfig } from "@/lib/affiliate/bol";

type ShopLinks = { amazon: AmazonLinkConfig | null; bol: BolLinkConfig | null };

const ShopLinksContext = createContext<ShopLinks>({ amazon: null, bol: null });

const SPONSORED_REL = "sponsored nofollow noopener noreferrer";

export function AmazonAffiliateProvider({
  config,
  bol = null,
  children,
}: {
  config: AmazonLinkConfig | null;
  bol?: BolLinkConfig | null;
  children: ReactNode;
}) {
  return <ShopLinksContext.Provider value={{ amazon: config, bol }}>{children}</ShopLinksContext.Provider>;
}

export function useAmazonAffiliate() {
  return useContext(ShopLinksContext).amazon;
}

export function useBolAffiliate() {
  return useContext(ShopLinksContext).bol;
}

/** Deliberate "search in a shop" actions for a wish without its own link. Renders nothing when affiliate links are off. */
export function ShopSearchLinks({ title, className }: { title: string; className?: string }) {
  const amazon = useAmazonAffiliate();
  const bol = useBolAffiliate();
  const { t } = useI18n();
  const amazonHref = amazon ? buildAmazonSearchUrl(title, amazon) : null;
  const bolHref = bol ? buildBolSearchUrl(title, bol) : null;
  if (!amazonHref && !bolHref) return null;
  return (
    <>
      {bolHref ? (
        <a className={className} href={bolHref} target="_blank" rel={SPONSORED_REL} aria-label={t("affiliate.bol.searchLabel", { title })}>
          {t("affiliate.bol.search")}
        </a>
      ) : null}
      {amazonHref ? (
        <a className={className} href={amazonHref} target="_blank" rel={SPONSORED_REL} aria-label={t("affiliate.amazon.searchLabel", { title })}>
          {t("affiliate.amazon.search")}
        </a>
      ) : null}
    </>
  );
}

/**
 * The "view link" action for a wish. A user-entered amazon.com or bol.com link is tagged at
 * display time (the stored URL is untouched); other links stay as entered. Wishes without a
 * link get the deliberate shop search actions.
 */
export function WishLink({ url, title }: { url?: string; title: string }) {
  const amazon = useAmazonAffiliate();
  const bol = useBolAffiliate();
  const { t } = useI18n();
  if (!url) return <ShopSearchLinks title={title} />;
  const tagged = (amazon ? tagAmazonUrl(url, amazon) : null) ?? (bol ? wrapBolUrl(url, bol) : null);
  if (tagged) {
    return <a href={tagged} target="_blank" rel={SPONSORED_REL}>{t("common.viewLink")}</a>;
  }
  return <a href={url} target="_blank" rel="noopener noreferrer nofollow">{t("common.viewLink")}</a>;
}

/** Helper in the wish editor: search a shop for the typed title, then paste the chosen link back. */
export function AmazonEditorHelper({ title }: { title: string }) {
  const amazon = useAmazonAffiliate();
  const bol = useBolAffiliate();
  const { t } = useI18n();
  if (!amazon && !bol) return null;
  const hasSearch = Boolean(
    (amazon && buildAmazonSearchUrl(title, amazon)) || (bol && buildBolSearchUrl(title, bol)),
  );
  return (
    <div className="shop-search">
      {hasSearch ? (
        <>
          <p className="shop-search-hint"><strong>{t("affiliate.helperHint")}</strong></p>
          <div className="shop-search-actions">
            <ShopSearchLinks title={title} className="button button-secondary button-small" />
          </div>
        </>
      ) : (
        <p className="hint">{t("affiliate.helperEmpty")}</p>
      )}
    </div>
  );
}

/** Short disclosure shown next to a list that may contain commercial links. */
export function AmazonDisclosure() {
  const amazon = useAmazonAffiliate();
  const bol = useBolAffiliate();
  const { t } = useI18n();
  if (!amazon && !bol) return null;
  return <p className="hint affiliate-disclosure">{t(disclosureKey(Boolean(amazon), Boolean(bol)))}</p>;
}
