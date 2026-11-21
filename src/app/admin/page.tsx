import type { Metadata } from "next";
import Link from "next/link";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { ThemeAdminForm } from "@/components/ThemeAdminForm";
import { getServerI18n } from "@/i18n/server";
import { SITE_DOMAINS } from "@/lib/domains";
import { hasAdminSession, isAdminConfigured } from "@/lib/admin-auth";
import { getActiveAppearance, getThemeSettings } from "@/lib/theme-store";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("meta.admin.title"),
    description: t("meta.admin.description"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminPage() {
  const { t } = await getServerI18n();
  const configured = isAdminConfigured();
  const authenticated = configured && await hasAdminSession();

  return (
    <div className="shell page-section admin-page">
      <header className="admin-page-header">
        <span className="eyebrow">{t("admin.page.eyebrow")}</span>
        <h1>{t("admin.page.title")}</h1>
        <p className="lead">{t("admin.page.lead")}</p>
      </header>

      {!configured ? (
        <section className="notice warning admin-setup" role="status">
          <strong>{t("admin.setup.title")}</strong>
          <p>{t("admin.setup.body")}</p>
          <code>THEME_ADMIN_PASSWORD · THEME_ADMIN_SESSION_SECRET</code>
        </section>
      ) : !authenticated ? (
        <AdminLoginForm />
      ) : (
        <>
        <nav className="admin-subnav" aria-label={t("admin.nav.label")}>
          <Link href="/admin" aria-current="page">{t("admin.nav.settings")}</Link>
          <Link href="/admin/usage">{t("admin.nav.usage")}</Link>
        </nav>
        <ThemeAdminForm
          settings={await getThemeSettings()}
          appearances={await Promise.all(SITE_DOMAINS.map(async ({ host, locale: siteLocale }) => ({
            host,
            appearance: await getActiveAppearance(siteLocale),
          })))}
        />
        </>
      )}
    </div>
  );
}
