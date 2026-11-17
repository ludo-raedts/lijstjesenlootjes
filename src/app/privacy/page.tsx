import type { Metadata } from "next";
import { getServerI18n } from "@/i18n/server";
import { publicPageMetadata } from "@/lib/seo";
import { getAmazonLinkConfig, getBolLinkConfig } from "@/lib/affiliate/server";

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("privacy", "meta.privacy.title", "meta.privacy.description");
}

export default async function PrivacyPage() {
  const { locale, t } = await getServerI18n();
  const amazonLink = await getAmazonLinkConfig(locale);
  const bolLink = await getBolLinkConfig(locale);
  return (
    <div className="shell narrow page-section prose-page">
      <span className="eyebrow">{t("privacy.eyebrow")}</span>
      <h1>{t("privacy.title")}</h1>
      <p className="lead">{t("privacy.lead")}</p>
      <h2>{t("privacy.storedTitle")}</h2>
      <p>{t("privacy.storedBody")}</p>
      <h2>{t("privacy.retentionTitle")}</h2>
      <p>{t("privacy.retentionBody")}</p>
      <h2>{t("privacy.emailTitle")}</h2>
      <p>{t("privacy.emailBody")}</p>
      <h2>{t("privacy.notSentTitle")}</h2>
      <p>{t("privacy.notSentBody")}</p>
      {amazonLink ? (
        <>
          <h2>{t("privacy.affiliateTitle")}</h2>
          <p>{t("privacy.affiliateBody")}</p>
        </>
      ) : null}
      {bolLink ? (
        <>
          <h2>{t("privacy.affiliateBolTitle")}</h2>
          <p>{t("privacy.affiliateBolBody")}</p>
        </>
      ) : null}
    </div>
  );
}
