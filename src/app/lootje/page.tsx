import type { Metadata } from "next";
import { DrawReveal } from "@/components/DrawReveal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Je persoonlijke lootje en lijstje", description: "Bekijk je persoonlijke lootje en maak daarna je eigen wensenlijstje.", robots: { index: false, follow: false }, openGraph: { title: "Je persoonlijke lootje staat klaar", description: "Bekijk voor wie je een cadeau koopt en voeg je eigen wensen toe." } };
export default function DrawRevealPage() { return <div className="shell narrow page-section"><DrawReveal /></div>; }
