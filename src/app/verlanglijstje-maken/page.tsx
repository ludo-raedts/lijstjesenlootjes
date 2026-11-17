import type { Metadata } from "next";
import { WishlistCreate } from "@/components/WishlistCreate";
import { SeoContent } from "@/components/SeoContent";
import { getServerI18n } from "@/i18n/server";
import { JsonLd } from "@/components/JsonLd";
import { publicPageMetadata, webApplicationStructuredData } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return publicPageMetadata("wishlistCreate", "meta.wishlistCreate.title", "meta.wishlistCreate.description");
}

export default async function WishlistCreatePage() {
  const { t } = await getServerI18n();
  return (
    <>
      <JsonLd data={await webApplicationStructuredData("wishlistCreate", "meta.wishlistCreate.title", "meta.wishlistCreate.description")} />
      <header className="shell tool-hero"><span className="eyebrow">{t("wishlist.page.eyebrow")}</span><h1>{t("wishlist.page.title")}</h1><p className="lead">{t("wishlist.page.lead")}</p></header>
      <div className="shell tool-layout">
        <WishlistCreate />
        <aside className="side-note">
          <h2>{t("wishlist.page.asideTitle")}</h2>
          <ul><li>{t("wishlist.page.asideManage")}</li><li>{t("wishlist.page.asideGuest")}</li><li>{t("wishlist.page.asideReservation")}</li></ul>
        </aside>
      </div>
      <SeoContent prefix="wishlist.seo" stepCount={3} tipCount={3} faqCount={8} />
    </>
  );
}
