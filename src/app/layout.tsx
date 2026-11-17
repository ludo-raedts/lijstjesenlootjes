import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getServerI18n } from "@/i18n/server";
import { getSiteUrl, isVercelPreview } from "@/lib/site-url";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-ext-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "@fontsource/atkinson-hyperlegible/latin-ext-700.css";
import "./globals.css";

const baseUrl = getSiteUrl();

const openGraphLocales = { nl: "nl_NL", en: "en_GB" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getServerI18n();
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: t("meta.home.title"),
      template: `%s | ${t("app.name")}`,
    },
    description: t("meta.home.description"),
    applicationName: t("app.name"),
    robots: isVercelPreview() ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      locale: openGraphLocales[locale],
      siteName: t("app.name"),
      title: t("meta.home.openGraphTitle"),
      description: t("meta.home.description"),
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = await getServerI18n();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <I18nProvider locale={locale}>
          <a className="skip-link" href="#inhoud">{t("global.skipLink")}</a>
          <SiteHeader />
          <main id="inhoud">{children}</main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
