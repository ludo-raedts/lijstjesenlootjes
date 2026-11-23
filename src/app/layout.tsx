import type { Metadata } from "next";
import { AmazonAffiliateProvider } from "@/components/AmazonAffiliate";
import { PublicTrafficMeasurement } from "@/components/PublicTrafficMeasurement";
import { WebVitalsMeasurement } from "@/components/WebVitalsMeasurement";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getServerI18n } from "@/i18n/server";
import { getAmazonLinkConfig, getBolLinkConfig } from "@/lib/affiliate/server";
import { getRequestSiteUrl } from "@/lib/request-site";
import { seasonalMessageKey, socialImages } from "@/lib/seo";
import { isVercelPreview, isVercelProduction } from "@/lib/site-url";
import { getActiveAppearance } from "@/lib/theme-store";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-ext-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "@fontsource/atkinson-hyperlegible/latin-ext-700.css";
import "./globals.css";

const openGraphLocales = { nl: "nl_NL", en: "en_GB", de: "de_DE" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getServerI18n();
  const { theme } = await getActiveAppearance(locale);
  const description = t(seasonalMessageKey("meta.home.description", theme));
  return {
    metadataBase: new URL(await getRequestSiteUrl()),
    alternates: { canonical: "./" },
    title: {
      default: t(seasonalMessageKey("meta.home.title", theme)),
      template: `%s | ${t("app.name")}`,
    },
    description,
    applicationName: t("app.name"),
    robots: isVercelPreview() ? { index: false, follow: false } : undefined,
    twitter: { card: "summary_large_image" },
    openGraph: {
      type: "website",
      locale: openGraphLocales[locale],
      siteName: t("app.name"),
      title: t("meta.home.openGraphTitle"),
      description,
      images: socialImages("home", t("meta.home.openGraphTitle")),
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = await getServerI18n();
  const appearance = await getActiveAppearance(locale);
  const amazonLink = await getAmazonLinkConfig(locale);
  const bolLink = await getBolLinkConfig(locale);
  return (
    <html
      lang={locale}
      data-theme={appearance.theme}
      data-layout={appearance.layout}
      data-theme-source={appearance.themeSource}
      data-scroll-behavior="smooth"
    >
      <body>
        <I18nProvider locale={locale}>
          <AmazonAffiliateProvider config={amazonLink} bol={bolLink}>
            <a className="skip-link" href="#inhoud">{t("global.skipLink")}</a>
            <SiteHeader />
            <main id="inhoud">{children}</main>
            <SiteFooter />
          </AmazonAffiliateProvider>
        </I18nProvider>
        {isVercelProduction() ? <><PublicTrafficMeasurement /><WebVitalsMeasurement /></> : null}
      </body>
    </html>
  );
}
