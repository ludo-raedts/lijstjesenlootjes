import type { Metadata } from "next";
import { WishlistManage } from "@/components/WishlistManage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verlanglijstje beheren", robots: { index: false, follow: false } };

export default function WishlistManagePage() {
  return <><header className="shell tool-hero"><span className="eyebrow">Persoonlijke pagina</span><h1>Beheer je lijstje.</h1><p className="lead">Wie deze beheerlink heeft, kan je lijstje aanpassen.</p></header><div className="shell narrow page-section" style={{ paddingTop: 0 }}><WishlistManage /></div></>;
}
