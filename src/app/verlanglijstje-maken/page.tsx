import type { Metadata } from "next";
import { WishlistCreate } from "@/components/WishlistCreate";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("meta.wishlistCreate.title"), description: t("meta.wishlistCreate.description") };
}

export default async function WishlistCreatePage() {
  const { t } = await getServerI18n();
  return (
    <>
      <header className="shell tool-hero"><span className="eyebrow">{t("wishlist.page.eyebrow")}</span><h1>{t("wishlist.page.title")}</h1><p className="lead">{t("wishlist.page.lead")}</p></header>
      <div className="shell tool-layout">
        <WishlistCreate />
        <aside className="side-note">
          <h2>{t("wishlist.page.asideTitle")}</h2>
          <ul><li>{t("wishlist.page.asideManage")}</li><li>{t("wishlist.page.asideGuest")}</li><li>{t("wishlist.page.asideReservation")}</li></ul>
        </aside>
      </div>
    </>
  );
}
