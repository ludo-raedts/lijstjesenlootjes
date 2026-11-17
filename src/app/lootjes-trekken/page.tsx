import type { Metadata } from "next";
import { DrawCreate } from "@/components/DrawCreate";

export const metadata: Metadata = { title: "Online lootjes trekken met eigen verlanglijstjes", description: "Trek online lootjes met uitsluitingen. Iedere deelnemer krijgt een persoonlijke link en maakt na het loten een eigen wensenlijstje." };

export default function DrawPage() {
  return <><header className="shell tool-hero"><span className="eyebrow">Lootjes trekken</span><h1>Geheim voor de groep, helder geregeld.</h1><p className="lead">Vul de deelnemers in, trek eerlijk de lootjes en deel iedere persoonlijke link. Na het openen maakt iedereen meteen een eigen wensenlijstje.</p></header><div className="shell tool-layout"><DrawCreate /><aside className="side-note"><h2>Eerlijk en persoonlijk</h2><ul><li>Iedereen geeft én ontvangt precies één lootje.</li><li>Iedere deelnemer kan een eigen lijstje maken.</li><li>Op deze lijstjes zijn geen reserveringen nodig.</li><li>De organisator ziet geen overzicht van de koppelingen.</li></ul></aside></div></>;
}
