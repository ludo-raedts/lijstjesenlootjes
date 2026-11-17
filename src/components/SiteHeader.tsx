import Link from "next/link";
import { GiftMark } from "@/components/Art";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getServerI18n } from "@/i18n/server";

export async function SiteHeader() {
  const { t } = await getServerI18n();
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label={t("nav.homeLabel")}>
          <GiftMark className="wordmark-mark" />
          <span className="wordmark-text">{t("app.name")}</span>
        </Link>
        <nav className="main-nav desktop-nav" aria-label={t("nav.label")}>
          <Link href="/verlanglijstje-maken">{t("nav.wishlist")}</Link>
          <Link href="/lootjes-trekken">{t("nav.draw")}</Link>
          <Link href="/help">{t("nav.help")}</Link>
          <LanguageSwitcher />
        </nav>
        <details className="mobile-nav">
          <summary>
            <span className="mobile-nav-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>{t("nav.menu")}</span>
          </summary>
          <nav className="mobile-nav-panel" aria-label={t("nav.label")}>
            <Link href="/verlanglijstje-maken">{t("nav.wishlist")}</Link>
            <Link href="/lootjes-trekken">{t("nav.draw")}</Link>
            <Link href="/help">{t("nav.help")}</Link>
            <LanguageSwitcher />
          </nav>
        </details>
      </div>
    </header>
  );
}
