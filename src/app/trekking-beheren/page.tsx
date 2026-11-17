import type { Metadata } from "next";
import { DrawAdmin } from "@/components/DrawAdmin";
import { getServerI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("meta.drawAdmin.title"), robots: { index: false, follow: false } };
}

export default async function DrawAdminPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <header className="shell tool-hero"><span className="eyebrow">{t("draw.admin.pageEyebrow")}</span><h1>{t("draw.admin.pageTitle")}</h1><p className="lead">{t("draw.admin.pageLead")}</p></header>
      <div className="shell narrow page-section" style={{ paddingTop: 0 }}><DrawAdmin /></div>
    </>
  );
}
