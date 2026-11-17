import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getServerI18n } from "@/i18n/server";

export async function SiteHeader() {
  const { t } = await getServerI18n();
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label={t("nav.homeLabel")}>
          <span className="wordmark-mark" aria-hidden="true">✓</span>
          <span>{t("app.name")}</span>
        </Link>
        <nav className="main-nav" aria-label={t("nav.label")}>
          <Link href="/verlanglijstje-maken"><span>01</span>{t("nav.wishlist")}</Link>
          <Link href="/lootjes-trekken"><span>02</span>{t("nav.draw")}</Link>
          <Link href="/help"><span>03</span>{t("nav.help")}</Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
