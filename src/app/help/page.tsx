import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help",
  description: "Hulp bij beheerlinks, persoonlijke lootjes en cadeaureserveringen.",
};

export default function HelpPage() {
  return (
    <div className="shell narrow page-section prose-page">
      <span className="eyebrow">Hulp</span>
      <h1>Zo werkt het</h1>
      <p className="lead">De belangrijkste antwoorden over persoonlijke links, reserveringen en delen.</p>

      <details open><summary>Wat als ik mijn beheerlink kwijt ben?</summary><p>Er is nog geen e-mailherstel ingericht. Zonder beheerlink kun je het lijstje of de trekking mogelijk niet meer beheren. Bewaar de link daarom in je wachtwoordmanager of op een andere veilige plek.</p></details>
      <details><summary>Kan de organisator alle lootjes zien?</summary><p>Nee, het beheerscherm toont geen overzicht van de koppelingen. De organisator geeft wel de persoonlijke links uit en kan zo’n link in beginsel zelf openen. Deel die links daarom zorgvuldig.</p></details>
      <details><summary>Kan iedere deelnemer een eigen lijstje maken?</summary><p>Ja. Na het openen van het persoonlijke lootje kan iedere deelnemer wensen toevoegen. Degene die deze deelnemer heeft getrokken ziet dat lijstje via de eigen link. Er zijn geen reserveringen nodig, omdat maar één persoon dit lootje heeft.</p></details>
      <details><summary>Is een cadeau echt gekocht als het gereserveerd is?</summary><p>Nee. Gereserveerd betekent alleen dat een gast heeft aangegeven dit cadeau te willen geven. Het systeem controleert geen aankoop.</p></details>
      <details><summary>Kan ik een reservering terugdraaien?</summary><p>Ja, zolang je dezelfde browsersessie gebruikt. Wis je de cookies of open je de lijst op een ander apparaat, dan kan de testversie jouw reservering niet meer herkennen.</p></details>
      <details><summary>Wordt WhatsApp automatisch verstuurd?</summary><p>Nee. De site maakt een persoonlijk bericht klaar. Jij kiest de ontvanger en verstuurt het zelf. Een klik op delen is geen bewijs dat het bericht is aangekomen.</p></details>
      <details><summary>Werkt e-mail al?</summary><p>Nee. Er is nog geen mailprovider, afzender of DNS ingericht en getest. Daarom biedt deze MVP alleen handmatig delen.</p></details>

      <div className="callout">
        <strong>Klaar om te proberen?</strong>
        <p>Gebruik voorlopig alleen verzonnen testnamen totdat het privacy- en bewaarbeleid definitief is.</p>
        <Link className="button" href="/lootjes-trekken">Start een testtrekking</Link>
      </div>
    </div>
  );
}
