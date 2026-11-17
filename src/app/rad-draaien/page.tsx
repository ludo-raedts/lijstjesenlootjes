import type { Metadata } from "next";
import { Wheel } from "@/components/Wheel";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("meta.wheel.title"), description: t("meta.wheel.description") };
}

export default async function WheelPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <header className="shell tool-hero"><span className="eyebrow">{t("wheel.page.eyebrow")}</span><h1>{t("wheel.page.title")}</h1><p className="lead">{t("wheel.page.lead")}</p></header>
      <div className="shell page-section" style={{ paddingTop: 0 }}><Wheel /></div>
    </>
  );
}
