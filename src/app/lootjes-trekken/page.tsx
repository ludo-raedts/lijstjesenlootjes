import type { Metadata } from "next";
import { DrawCreate } from "@/components/DrawCreate";
import { SeoContent } from "@/components/SeoContent";
import { getServerI18n } from "@/i18n/server";
import { JsonLd } from "@/components/JsonLd";
import Link from "next/link";
import { getPagePath } from "@/lib/request-site";
import { publicPageMetadata, webApplicationStructuredData } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("drawCreate", "meta.drawCreate.title", "meta.drawCreate.description");
}

export default async function DrawPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <JsonLd data={await webApplicationStructuredData("drawCreate", "meta.drawCreate.title", "meta.drawCreate.description")} />
      <header className="shell tool-hero"><span className="eyebrow">{t("draw.page.eyebrow")}</span><h1>{t("draw.page.title")}</h1><p className="lead">{t("draw.page.lead")}</p></header>
      <div className="shell tool-layout">
        <DrawCreate />
        <aside className="side-note">
          <h2>{t("draw.page.asideTitle")}</h2>
          <ul><li>{t("draw.page.aside1")}</li><li>{t("draw.page.aside2")}</li><li>{t("draw.page.aside3")}</li><li>{t("draw.page.aside4")}</li></ul>
          <p><Link href={await getPagePath("drawTogether")}>{t("draw.page.togetherLink")}</Link></p>
        </aside>
      </div>
      <SeoContent prefix="draw.seo" stepCount={4} tipCount={4} faqCount={8} extraSection />
    </>
  );
}
