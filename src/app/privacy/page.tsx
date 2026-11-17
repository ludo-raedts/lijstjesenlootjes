import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy in de proefversie",
  description: "Wat de besloten proefversie van Lijstjes en lootjes wel en niet bewaart.",
};

export default function PrivacyPage() {
  return (
    <div className="shell narrow page-section prose-page">
      <span className="eyebrow">Besloten proefversie</span>
      <h1>Privacy vóór publicatie</h1>
      <p className="lead">Deze MVP is gemaakt om functies en gebruiksgemak te beoordelen. Hij is nog niet geschikt voor publieke ingebruikname of echte persoonsgegevens.</p>
      <h2>Wat wordt bewaard</h2>
      <p>Verlanglijstjes, reserveringen en trekkingen staan in een afgeschermde Supabase-database in Frankfurt. Alleen servercode heeft toegang tot deze gegevens. Toegangstokens en sessietokens worden uitsluitend als SHA-256-hash opgeslagen. Ruwe persoonlijke links worden alleen getoond wanneer ze worden aangemaakt of vervangen.</p>
      <h2>Wat niet wordt verstuurd</h2>
      <p>De radpagina stuurt namen, vragen en uitslagen niet naar de server, analytics of externe scripts. Er is geen mailprovider en er worden geen WhatsApp-berichten autonoom verstuurd.</p>
      <h2>Wat nog moet gebeuren</h2>
      <p>Voor livegang zijn onder meer definitieve bewaartermijnen, verwijder- en back-upprocessen, verwerkersafspraken, misbruikbeperking, monitoring en een definitieve privacyverklaring nodig. Die keuzes zijn bewust nog niet als feiten ingevuld.</p>
      <div className="notice warning"><strong>Gebruik nu alleen testdata.</strong><span>De proefomgeving is bedoeld voor review en kan tijdens ontwikkeling worden gewist.</span></div>
    </div>
  );
}
