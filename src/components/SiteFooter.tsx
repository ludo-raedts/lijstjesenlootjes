import Link from "next/link";
import { getServerI18n } from "@/i18n/server";
import { hasPath } from "@/lib/paths";
import { getContactEmail, getPagePath } from "@/lib/request-site";

export async function SiteFooter() {
  const { locale, t } = await getServerI18n();
  const contactEmail = await getContactEmail();
  return (
    <footer className="site-footer">
      <span className="footer-flowers" aria-hidden="true" />
      <div className="shell footer-grid">
        <div>
          <p className="footer-brand">{t("app.name")}</p>
          <p className="muted">{t("footer.description")}</p>
        </div>
        <nav aria-label={t("footer.navigationLabel")}>
          {hasPath("sinterklaasDraw", locale) ? <Link href={await getPagePath("sinterklaasDraw")}>{t("footer.sinterklaas")}</Link> : null}
          {hasPath("officeDraw", locale) ? <Link href={await getPagePath("officeDraw")}>{t("footer.office")}</Link> : null}
          {hasPath("birthdayWishlist", locale) ? <Link href={await getPagePath("birthdayWishlist")}>{t("footer.birthday")}</Link> : null}
          <Link href={await getPagePath("wheel")}>{t("footer.wheel")}</Link>
          <Link href="/help">{t("footer.help")}</Link>
          <Link href={await getPagePath("recover")}>{t("footer.recover")}</Link>
          <Link href="/privacy">{t("footer.privacy")}</Link>
          <a href={`mailto:${contactEmail}`}>{t("footer.contact")}</a>
        </nav>
      </div>
    </footer>
  );
}
