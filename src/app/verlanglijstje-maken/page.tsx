import type { Metadata } from "next";
import { WishlistCreate } from "@/components/WishlistCreate";

export const metadata: Metadata = {
  title: "Verlanglijstje maken en delen",
  description: "Maak zonder account een verlanglijstje, deel een gastenlink en voorkom dubbele cadeaukeuzes met reserveringen.",
};

export default function WishlistCreatePage() {
  return (
    <>
      <header className="shell tool-hero"><span className="eyebrow">Verlanglijstje</span><h1>Zet je wensen op een rij.</h1><p className="lead">Deel je lijstje met wie je wilt. Een eigen omschrijving is net zo goed als een winkellink.</p></header>
      <div className="shell tool-layout">
        <WishlistCreate />
        <aside className="side-note"><h2>Je houdt twee links apart</h2><ul><li><strong>Beheerlink:</strong> alleen voor jou, om wensen te wijzigen.</li><li><strong>Gastenlink:</strong> om te delen en cadeaus te laten reserveren.</li><li>Een reservering is geen bewijs dat iets is gekocht.</li></ul></aside>
      </div>
    </>
  );
}
