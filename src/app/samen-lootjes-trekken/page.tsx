import type { Metadata } from "next";
import { DrawTogether } from "@/components/DrawTogether";
import { JsonLd } from "@/components/JsonLd";
import { SeoContent } from "@/components/SeoContent";
import { getServerI18n } from "@/i18n/server";
import { getPagePath } from "@/lib/request-site";
import { publicPageMetadata, webApplicationStructuredData } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("drawTogether", "meta.together.title", "meta.together.description");
}

export default async function DrawTogetherPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <JsonLd data={await webApplicationStructuredData("drawTogether", "meta.together.title", "meta.together.description")} />
      <header className="shell tool-hero">
        <span className="eyebrow">{t("together.page.eyebrow")}</span>
        <h1>{t("together.page.title")}</h1>
        <p className="lead">{t("together.page.lead")}</p>
      </header>
      <div className="shell narrow page-section" style={{ paddingTop: 0 }}>
        <DrawTogether wishlistHref={await getPagePath("wishlistCreate")} />
      </div>
      <SeoContent prefix="together.seo" stepCount={3} tipCount={4} faqCount={4} />
    </>
  );
}
