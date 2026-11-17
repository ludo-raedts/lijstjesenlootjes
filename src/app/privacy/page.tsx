import type { Metadata } from "next";
import { getServerI18n } from "@/i18n/server";
import { getAmazonLinkConfig } from "@/lib/affiliate/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("meta.privacy.title"), description: t("meta.privacy.description") };
}

export default async function PrivacyPage() {
  const { locale, t } = await getServerI18n();
  const amazonLink = await getAmazonLinkConfig(locale);
  return (
    <div className="shell narrow page-section prose-page">
      <span className="eyebrow">{t("privacy.eyebrow")}</span>
      <h1>{t("privacy.title")}</h1>
      <p className="lead">{t("privacy.lead")}</p>
      <h2>{t("privacy.storedTitle")}</h2>
      <p>{t("privacy.storedBody")}</p>
      <h2>{t("privacy.retentionTitle")}</h2>
      <p>{t("privacy.retentionBody")}</p>
      <h2>{t("privacy.notSentTitle")}</h2>
      <p>{t("privacy.notSentBody")}</p>
      {amazonLink ? (
        <>
          <h2>{t("privacy.affiliateTitle")}</h2>
          <p>{t("privacy.affiliateBody")}</p>
        </>
      ) : null}
      <h2>{t("privacy.todoTitle")}</h2>
      <p>{t("privacy.todoBody")}</p>
      <div className="notice warning"><strong>{t("privacy.warningTitle")}</strong><span>{t("privacy.warningBody")}</span></div>
    </div>
  );
}
