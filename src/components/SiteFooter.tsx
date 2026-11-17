import Link from "next/link";
import { getServerI18n } from "@/i18n/server";

export async function SiteFooter() {
  const { t } = await getServerI18n();
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
      </div>
    </footer>
  );
}
