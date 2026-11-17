import type { Metadata } from "next";
import { DrawAdmin } from "@/components/DrawAdmin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trekking beheren", robots: { index: false, follow: false } };
export default function DrawAdminPage() { return <><header className="shell tool-hero"><span className="eyebrow">Persoonlijke pagina</span><h1>Beheer je trekking.</h1><p className="lead">De trekking is bevroren. Je kunt alleen verloren persoonlijke links vervangen.</p></header><div className="shell narrow page-section" style={{ paddingTop: 0 }}><DrawAdmin /></div></>; }
