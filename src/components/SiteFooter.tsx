import Link from "next/link";
import { disclosureKey } from "@/lib/affiliate/disclosure";
import { getServerI18n } from "@/i18n/server";
import { getAmazonLinkConfig, getBolLinkConfig } from "@/lib/affiliate/server";
import { hasPath } from "@/lib/paths";
import { getPagePath } from "@/lib/request-site";

export async function SiteFooter() {
  const { locale, t } = await getServerI18n();
  const amazonLink = await getAmazonLinkConfig(locale);
  const bolLink = await getBolLinkConfig(locale);
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
          <Link href={await getPagePath("wheel")}>{t("footer.wheel")}</Link>
          <Link href="/help">{t("footer.help")}</Link>
          <Link href={await getPagePath("recover")}>{t("footer.recover")}</Link>
          <Link href="/privacy">{t("footer.privacy")}</Link>
        </nav>
        {amazonLink || bolLink ? <p className="hint affiliate-disclosure">{t(disclosureKey(Boolean(amazonLink), Boolean(bolLink)))}</p> : null}
      </div>
    </footer>
  );
}
