import type { Metadata } from "next";
import { WishlistGuest } from "@/components/WishlistGuest";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Een verlanglijstje bekijken", description: "Bekijk een gedeeld verlanglijstje.", robots: { index: false, follow: false }, openGraph: { title: "Een verlanglijstje staat voor je klaar", description: "Open de persoonlijke link om het lijstje te bekijken." } };

export default function WishlistGuestPage() {
  return <><header className="shell tool-hero"><span className="eyebrow">Gedeeld met jou</span><h1>Een lijstje vol wensen.</h1></header><div className="shell narrow page-section" style={{ paddingTop: 0 }}><WishlistGuest /></div></>;
}
