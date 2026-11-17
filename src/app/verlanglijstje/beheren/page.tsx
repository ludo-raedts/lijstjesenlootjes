import type { Metadata } from "next";
import { WishlistManage } from "@/components/WishlistManage";
import { getServerI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("meta.wishlistManage.title"), robots: { index: false, follow: false } };
}

export default async function WishlistManagePage() {
  const { t } = await getServerI18n();
  return (
    <>
      <header className="shell tool-hero"><span className="eyebrow">{t("wishlist.manage.pageEyebrow")}</span><h1>{t("wishlist.manage.pageTitle")}</h1><p className="lead">{t("wishlist.manage.pageLead")}</p></header>
      <div className="shell narrow page-section" style={{ paddingTop: 0 }}><WishlistManage /></div>
    </>
  );
}
