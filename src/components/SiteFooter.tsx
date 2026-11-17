import Link from "next/link";
import { getServerI18n } from "@/i18n/server";
import { getAmazonLinkConfig } from "@/lib/affiliate/server";

export async function SiteFooter() {
  const { locale, t } = await getServerI18n();
  const amazonLink = await getAmazonLinkConfig(locale);
  return (
    <footer className="site-footer">
      <span className="footer-flowers" aria-hidden="true" />
      <div className="shell footer-grid">
        <div>
          <p className="footer-brand">{t("app.name")}</p>
          <p className="muted">{t("footer.description")}</p>
        </div>
        <nav aria-label={t("footer.navigationLabel")}>
          <Link href="/rad-draaien">{t("footer.wheel")}</Link>
          <Link href="/help">{t("footer.help")}</Link>
          <Link href="/privacy">{t("footer.privacy")}</Link>
        </nav>
        <p className="footer-edition">{t("footer.edition")}</p>
        {amazonLink ? <p className="hint affiliate-disclosure">{t("affiliate.disclosure")}</p> : null}
      </div>
    </footer>
  );
}
