import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSiteUrl, isVercelPreview } from "@/lib/site-url";
import "./globals.css";

const baseUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Verlanglijstjes maken en online lootjes trekken",
    template: "%s | Lijstjes en lootjes",
  },
  description:
    "Maak een verlanglijstje of trek online lootjes. Na de trekking maakt iedere deelnemer een eigen lijstje via de persoonlijke link.",
  applicationName: "Lijstjes en lootjes",
  robots: isVercelPreview() ? { index: false, follow: false } : undefined,
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: "Lijstjes en lootjes",
    title: "Lijstjes en lootjes",
    description: "Samen wensen, lootjes trekken en gericht geven.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#inhoud">Ga naar de inhoud</a>
        <SiteHeader />
        <main id="inhoud">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
