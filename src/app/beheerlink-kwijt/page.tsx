import type { Metadata } from "next";
import { RecoverForm } from "@/components/RecoverForm";
import { getServerI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("meta.recover.title"),
    description: t("meta.recover.description"),
    robots: { index: false, follow: false },
  };
}

export default async function RecoverPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <header className="shell tool-hero">
        <span className="eyebrow">{t("recover.eyebrow")}</span>
        <h1>{t("recover.title")}</h1>
        <p className="lead">{t("recover.lead")}</p>
      </header>
      <div className="shell narrow page-section" style={{ paddingTop: 0 }}>
        <RecoverForm />
      </div>
    </>
  );
}
