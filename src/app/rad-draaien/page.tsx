import type { Metadata } from "next";
import { Wheel } from "@/components/Wheel";

export const metadata: Metadata = { title: "Rad draaien met namen of keuzes", description: "Vul namen of mogelijkheden in en laat een lokaal draaiend rad een keuze maken. De invoer blijft in je browser." };
export default function WheelPage() { return <><header className="shell tool-hero"><span className="eyebrow">Rad draaien</span><h1>Geef de keuze even uit handen.</h1><p className="lead">Namen, gerechten of taken: vul ze in en laat het rad op dit apparaat één mogelijkheid kiezen.</p></header><div className="shell page-section" style={{ paddingTop: 0 }}><Wheel /></div></>; }
