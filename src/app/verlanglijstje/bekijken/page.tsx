import type { Metadata } from "next";
import { WishlistGuest } from "@/components/WishlistGuest";
import { getServerI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("meta.wishlistGuest.title"),
    description: t("meta.wishlistGuest.description"),
    robots: { index: false, follow: false },
    openGraph: { title: t("meta.wishlistGuest.openGraphTitle"), description: t("meta.wishlistGuest.openGraphDescription") },
  };
}

export default async function WishlistGuestPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <header className="shell tool-hero"><span className="eyebrow">{t("wishlist.guest.pageEyebrow")}</span><h1>{t("wishlist.guest.pageTitle")}</h1></header>
      <div className="shell narrow page-section" style={{ paddingTop: 0 }}><WishlistGuest /></div>
    </>
  );
}
