# SEO-plan — Lijstjes & Lootjes / Wishlists & Draws

**Status (17 november 2026, na de laatste sprint):** fase 0 en 1 en het grootste deel van fase 2 zijn uitgevoerd (robots-fix, per-pagina OG-metadata, deelafbeelding `/og`, keywordtitels en -koppen, Engelse padhernoeming met 308's, taalschakelaar met domeinlinks, JSON-LD, contentblokken met FAQ, de Sinterklaas-landingspagina). Search Console en Bing Webmaster Tools zijn ingesteld (19 november 2026). Open: Core Web Vitals en maandelijkse SEO-metingen, linkbuilding. De vinkjes hieronder zijn bijgewerkt; de bevindingen en tabellen laten de situatie van vóór de uitvoering zien.

Opgesteld op 17 november 2026 op basis van de code en de live sites `lijstjesenlootjes.nl` en `wishanddraw.com`. Alle bevindingen over titels, headings, robots en sitemap zijn live gecontroleerd. Zoekvolumes zijn **niet** gemeten: valideer de keywordkeuzes in Search Console en een keywordtool voordat je er grote beslissingen op neemt.

## 1. Samenvatting

De technische basis is sterk: één padentabel, canonical per domein, `hreflang` in Link-headers en sitemap, `www` → apex, `noindex` op privépagina’s, echte HTML-tekst en goede `lang`. Het probleem zit in drie dingen:

1. **Eén echte indexeringsbug**: `robots.txt` blokkeert op het Nederlandse domein `/lootjes-trekken` (zie 2.1).
2. **De koppen en titels zijn merk-/sfeerteksten, geen zoektermen.** H1’s als “Geheim voor de groep, helder geregeld.” bevatten geen enkel keyword; de Engelse site mikt op “draw names” terwijl Engelstalige zoekers “Secret Santa generator” intypen.
3. **De pagina’s zijn dun**: een formulier plus een zijbalk. Tegen concurrenten met uitleg, tips en FAQ is dat niet genoeg om te ranken op “lootjes trekken”.

Timing: Sinterklaas is 5 december en het zoekpiek-seizoen loopt van ruwweg oktober tot kerst. Indexering kost weken, dus fase 0 (dagen) moet nu; de rest bouwt aan het seizoen van volgend jaar én aan wat nog dit jaar kan meeliften.

## 2. Bevindingen

### 2.1 Kritiek / hoog

| # | Bevinding | Bewijs | Oplossing |
|---|-----------|--------|-----------|
| 1 | `Disallow: /lootje` is een prefix-match en blokkeert daarmee `/lootjes-trekken`, de belangrijkste landingspagina, op `lijstjesenlootjes.nl` (de pagina staat wel in de sitemap). | `https://lijstjesenlootjes.nl/robots.txt` | In `src/app/robots.ts` de privépaden als exacte paden + submap uitgeven: `Disallow: /lootje$` en `/lootje/`. Test toevoegen in `tests/paths.test.ts` dat geen enkel publiek pad door een disallow-regel geraakt wordt. |
| 2 | OG- en Twitter-titel/-beschrijving zijn op **elke** pagina die van de homepage (“Maak een lijstje. Trek lootjes…”). Pagina’s overschrijven alleen `title`/`description`. Bovendien geen `og:image`, geen `og:url`, `twitter:card=summary` zonder afbeelding. | Live bij `/lootjes-trekken` en `/draw-names` | Per pagina een volledig `openGraph`-object (Next vervangt het object, het wordt niet samengevoegd). Eén helper in `src/lib` die titel, beschrijving, url en afbeelding invult. |
| 3 | Geen deelafbeelding. Deelkaartjes via WhatsApp/Facebook zijn het belangrijkste verspreidingskanaal voor dit product. | geen `opengraph-image` in `src/app` | 1200×630 JPG/PNG per seizoensthema (de AVIF-heroes kunnen niet als OG-afbeelding). `opengraph-image.tsx` of statische bestanden. Alt-tekst via `openGraph.images[].alt`. |
| 4 | De taalschakelaar zet alleen een cookie en ververst. Op `lijstjesenlootjes.nl/lootjes-trekken` kan dus Engelse tekst staan. Dat is een mismatch met `hreflang`/canonical en er is geen crawlbare link tussen de taalversies. | `src/components/LanguageSwitcher.tsx` | Schakelaar laten linken naar dezelfde pagina op het andere domein (`alternatesFor(key)`), als echte `<a hreflang>`-links. Cookie alleen nog voor de voorkeurstaal bij de eerste bezoek-redirect, indien gewenst. |

### 2.2 Middel

| # | Bevinding | Oplossing |
|---|-----------|-----------|
| 5 | Sitemap zet `lastModified: new Date()` bij elk verzoek en gebruikt `changeFrequency`/`priority` (worden door Google genegeerd). Een altijd-nieuwe lastmod ondermijnt het vertrouwen in het veld. | Vaste datum per pagina (constante in `paths.ts` of bij build), `priority`/`changeFrequency` weglaten. |
| 6 | Alle publieke pagina’s worden dynamisch gerenderd (`Cache-Control: private, no-store`), omdat host, cookie en thema per verzoek worden gelezen. Elke crawl en bezoek kost een serverrender; dat drukt TTFB/LCP. | Fase 3: meten (CrUX/PageSpeed); overweeg per-host statische varianten of `use cache` voor de contentdelen. Niet urgent bij lage traffic. |
| 7 | (Opgelost: de footer en de privacytekst spreken niet meer over een proefversie.) Het footerlabel “besloten proefversie · nog niet publiek” en de privacypagina (“nog niet geschikt voor publieke ingebruikname of echte persoonsgegevens”) staan op elke geïndexeerde pagina. Dat is een vertrouwens- en snippetprobleem zodra je actief gaat werven. | Productbeslissing (zie 6). Tot de publieke lancering: overweeg `noindex` of verwijder deze teksten zodra de lancering een feit is. |
| 8 | Geen structured data. | Zie 4. |
| 9 | Geen hreflang in de HTML-`<head>` (wel in Link-header en sitemap). Dat is geldig, maar tools en collega’s zien het minder snel. | `alternates.languages` in metadata erbij zetten (kleine moeite, geen conflict). |
| 10 | Geen analytics en geen Search Console (README: “nog geen analytics”). Zonder meting valt SEO niet te sturen. | Zie 5, fase 0. |

### 2.3 Laag

- `/privacy` en `/help` staan op beide domeinen op hetzelfde pad: prima, hreflang is correct.
- `robots.txt` en `noindex`-header overlappen op privépaden (disallow voorkomt dat Google de noindex ziet). Geen probleem zolang er niet naar gelinkt wordt; de fragmenttokens bereiken de server nooit.
- Hero-afbeelding heeft goede alt-tekst en AVIF. Decoratieve motieven staan terecht op `alt=""`.
- Home: stappen (`<strong>`) kunnen `h3` worden; “Twee manieren om te geven” is een `<p>` — acceptabel.

## 3. Pagina’s: namen (URL’s), titels, descriptions en koppen

Lengtes zijn tekens incl. merknaam; doel ≤ 60 voor titels en ≤ 155 voor descriptions. Titels staan hier **zonder** merk; het template voegt ` | Lijstjes & Lootjes` toe. De homepage gebruikt `title.default` en dus geen template.

### 3.1 Nederlands (`lijstjesenlootjes.nl`)

| Pagina | URL nu | URL-advies | Title nu → voorstel | H1 nu → voorstel |
|--------|--------|-----------|---------------------|------------------|
| Home | `/` | `/` | “Verlanglijstje maken en online lootjes trekken | …” (66) → **“Lootjes trekken & verlanglijstje maken | Lijstjes & Lootjes”** (58) | “Maak een lijstje. Trek lootjes. Geef met aandacht.” → **“Lootjes trekken en een verlanglijstje maken, zonder account”**, de slogan wordt de `eyebrow`/lead. (Alternatief: slogan houden en keyword in de lead plaatsen; zwakker.) |
| Lootjes trekken | `/lootjes-trekken` | behouden (exacte match van de kernterm) | “Online lootjes trekken” → **“Online lootjes trekken met uitsluitingen”** (61 met merk) | “Geheim voor de groep, helder geregeld.” → **“Online lootjes trekken: geheim voor de groep, helder geregeld.”** |
| Verlanglijstje | `/verlanglijstje-maken` | behouden | “Verlanglijstje maken en delen” (goed, blijft) | “Zet je wensen op één plek.” → **“Verlanglijstje maken en delen: je wensen op één plek.”** |
| Rad | `/rad-draaien` | overweeg `/namenrad` (zoekterm); lage prioriteit | “Rad draaien met namen of keuzes” → **“Namenrad: rad draaien met namen of keuzes”** | “Geef de keuze even uit handen.” → **“Namenrad: geef de keuze even uit handen.”** |
| Help | `/help` | behouden; later `/veelgestelde-vragen` overwegen | “Help” (kaal) → **“Veelgestelde vragen”** | “Zo werkt het” → **“Veelgestelde vragen over lootjes en verlanglijstjes”** |
| Privacy | `/privacy` | behouden | “Privacy in de proefversie” ≠ H1 “Privacy vóór publicatie” → **één tekst voor beide**, bv. “Privacy: wat we bewaren” | idem |

Descriptions (NL):

- Home (156): “Trek online lootjes of maak een verlanglijstje om te delen met familie, vrienden of collega’s. Zonder account of app: iedereen krijgt een persoonlijke link.”
- Lootjes trekken (143): “Trek online lootjes voor Sinterklaas, kerst of op kantoor. Met uitsluitingen, een persoonlijke link voor iedereen en geheim voor de organisator.”
- Verlanglijstje (137): “Maak een verlanglijstje zonder account, deel de gastenlink en laat familie en vrienden cadeaus reserveren, zodat niemand hetzelfde koopt.”
- Help: “Antwoorden over beheerlinks, persoonlijke lootjes, reserveringen en delen via WhatsApp.” (nu zonder context of call-to-action)

Het woord “gratis” bewust niet gebruiken: `DESIGN.md` bewaart dat voor na de verdienmodelbeslissing.

### 3.2 Engels (`wishanddraw.com`)

Hier zit de grootste winst. “Draw names” is geen gangbare zoekterm; Engelstalige gebruikers zoeken op **“Secret Santa generator”**, “Secret Santa name picker”, “wishlist maker”. Ga voor Brits Engels (`en_GB` is al ingesteld; controleer “organiser” vs. de huidige “organizer” in de catalogus voor consistentie).

| Pagina | URL nu | URL-advies | Title nu → voorstel | H1 nu → voorstel |
|--------|--------|-----------|---------------------|------------------|
| Home | `/` | `/` | “Create a wishlist and draw names online | …” → **“Secret Santa generator & wishlist maker | Wishlists & Draws”** (59) | → **“Secret Santa generator and wishlist maker, no account needed”** |
| Names draw | `/draw-names` | **`/secret-santa-generator`** (`/draw-names` blijft als 308-redirect) | “Draw names online” → **“Secret Santa generator: draw names online”** (61) | “Secret for the group, clearly arranged.” → **“Secret Santa generator: secret for the group, clearly arranged.”** |
| Wishlist | `/create-wishlist` | **`/wishlist-maker`** (redirect vanaf oud pad) | “Create and share a wishlist” → **“Wishlist maker: create and share a wishlist”** (63) | “Keep your wishes in one place.” → **“Wishlist maker: keep your wishes in one place.”** |
| Wheel | `/spin-the-wheel` | **`/name-wheel`** | “Spin a wheel with names or choices” → **“Name wheel: spin to pick a name”** (51) | “Let the wheel decide.” → **“Name wheel: let the wheel decide.”** |
| Help | `/help` | behouden | “Help” → **“Frequently asked questions”** | “How it works” → **“Questions about draws and wishlists”** |

Descriptions (EN):

- Names draw (151): “Draw names online for Secret Santa, Christmas or the office. Set exclusions, give everyone a personal link, and the organiser never sees who drew whom.”
- Wishlist (131): “Create a wishlist without an account, share the guest link and let friends and family reserve gifts, so nobody buys the same thing.”

**Waarom nu hernoemen**: de site is een besloten proefversie, dus er zijn nog geen opgebouwde links en rankings op de Engelse paden. Alle paden staan in `paths.ts`, de 308-redirect van het oude pad wordt automatisch gegenereerd (`redirectRules()`), en `tests/paths.test.ts` bewaakt de proxy-matcher. Kosten zijn dus klein; later wordt het duurder. De Nederlandse paden zijn al goed (kernterm in het pad, kort, koppeltekens).

> Let op: *Secret Santa* is seizoensgebonden. Dat botst niet met de neutrale “jaarrond”-positie uit `PROJECT_CONTEXT.md`: de term staat in titel/H1 van één pagina, de rest van de site blijft neutraal en `Lootjes trekken`/`Draw names` blijft de productnaam in de interface.

### 3.3 Kopstructuur (algemeen)

- Precies één `h1` per pagina, met het kernkeyword in de eerste woorden; de poëtische slogan mag erachter of als lead blijven staan. Visuele stijl hoeft niet te veranderen (zelfde `h1`-class).
- `h2` per zoekintentie (“Hoe werkt lootjes trekken?”, “Lootjes trekken met uitsluitingen”), niet alleen per formulierblok. De huidige `h2`’s (“De gelegenheid”, “De deelnemers”) zijn goede UI-labels maar geen SEO-koppen; behoud ze en voeg contentkoppen toe onder het formulier.
- Stappen op de home als `h3`.

## 4. Structured data

Eén JSON-LD-helper (server component, `<script type="application/ld+json">`), taalafhankelijk:

1. **`WebSite`** + **`Organization`** op de home: `name`, `url`, `inLanguage`, logo. Het `name` per domein: “Lijstjes & Lootjes” / “Wishlists & Draws”.
2. **`WebApplication`** op de tool-pagina’s (lootjes, verlanglijst, rad): `applicationCategory: "LifestyleApplication"`, `operatingSystem: "Any"`, `inLanguage`. `offers` pas toevoegen als de prijsbeslissing is genomen.
3. **`BreadcrumbList`** alleen als er diepere contentpagina’s komen (fase 2).
4. **Geen `FAQPage`**: Google toont FAQ-rich results sinds 2023 nauwelijks nog voor gewone sites. De FAQ blijft wel als zichtbare tekst waardevol.

## 5. Contentstrategie

Het ranken op “lootjes trekken” vraagt om pagina’s die de vraag volledig beantwoorden. Per kernpagina onder het formulier toevoegen (400–800 woorden, echte HTML, geen verborgen tekst):

- **Lootjes trekken**: hoe het werkt in 3–4 stappen, uitleg uitsluitingen (partners, huisgenoten), budgettips, wat de deelnemer ziet, privacy (organisator ziet geen uitkomst), korte FAQ.
- **Verlanglijstje**: hoe delen werkt, wat reserveren betekent, tips voor wensen die goed zijn om te geven.
- **Help-pagina**: vragen herschrijven naar echte zoekintenties naast de supportvragen (“Kan de organisator zien wie wie heeft getrokken?” is er al; voeg toe: “Hoe trek je lootjes zonder dat iemand mag spieken?”, “Wat als iemand zichzelf trekt?”).

Nieuwe landingspagina’s (vereist per taal een eigen pad; zie technische noot):

| Prioriteit | NL | EN |
|-----------|----|----|
| 1 (dit seizoen) | `/sinterklaas-lootjes-trekken` — seizoenspagina met uitleg, tips en doorverwijzing naar de tool | `/secret-santa-generator` (is de tool zelf, zie 3.2) |
| 2 | `/lootjes-trekken-op-kantoor` (collega’s, budget, afspraken) | `/office-secret-santa` |
| 3 | `/kerst-lootjes-trekken`, `/verlanglijstje-voor-sinterklaas` (past bij de bol/Amazon-roadmap) | `/christmas-wishlist` |

**Technische noot**: `PAGES` in `paths.ts` veronderstelt dat elke pagina in beide talen bestaat. Contentpagina’s hoeven dat niet. Maak `paths` per locale optioneel en genereer `hreflang`/sitemap alleen voor bestaande vertalingen (anders ontstaan `hreflang`-verwijzingen naar 404’s).

Interne links: verwijs vanuit de tools naar de hulppagina, vanuit de lijst naar de loting en omgekeerd (“Wil je ook lootjes trekken?”), en vanuit elke landingspagina met één duidelijke call-to-action naar de tool. Gebruik beschrijvende ankertekst (“online lootjes trekken”, niet “klik hier”).

## 6. Beslissingen die nodig zijn (van jou)

1. **Lancering**: blijft de site een besloten proefversie (dan eventueel `noindex` tot lancering, en geen actieve linkbuilding) of ga je nu publiek? De footer- en privacyteksten moeten daarbij mee. *Advies*: kies een lanceerdatum vóór het seizoen; tot dan alleen fase 0 uitvoeren.
2. **Engelse URL’s hernoemen** naar `/secret-santa-generator`, `/wishlist-maker`, `/name-wheel`? *Advies*: ja, nu het nog goedkoop is.
3. **Home-H1**: de slogan vervangen door een keywordkop? *Advies*: ja, slogan blijft als lead/eyebrow. Dit raakt de merkuitstraling (`DESIGN.md`), dus bevestig het.
4. **Analytics**: privacyvriendelijk en cookieloos (Plausible of Vercel Web Analytics) past bij de privacyboodschap; de README noemt dat er nu geen externe scripts zijn.
5. **Taalschakelaar** naar domeinlinks (2.1 #4): wijkt af van het huidige cookiegedrag; bevestig dat dat gewenst is.

## 7. Roadmap

### Fase 0 — deze week (klein, hoogste rendement)

- [x] Robots-fix `/lootje` → `/lootje$` en `/lootje/`, met test (2.1 #1).
- [x] Per-pagina `openGraph`/Twitter-metadata + `og:url` (2.1 #2).
- [x] Titels en descriptions uit 3.1/3.2 doorvoeren in `nl.ts`/`en.ts` (alleen catalogus; sleutels blijven stabiel).
- [ ] Google Search Console als **domeinproperty** voor beide domeinen + Bing Webmaster Tools; sitemap indienen; URL-inspectie op `/lootjes-trekken`.
- [x] Sitemap-`lastmod` vast zetten (2.2 #5).

### Fase 1 — komende 2 weken

- [x] H1-herziening en keywordkoppen onder de formulieren (3.1–3.3).
- [x] OG-afbeeldingen per seizoensthema (2.1 #3).
- [x] Taalschakelaar naar domeinlinks (2.1 #4) + `alternates.languages` in `<head>` (2.2 #9).
- [x] Engelse URL’s hernoemen met 308’s, in dezelfde release de sitemap en tests bijwerken (3.2).
- [x] JSON-LD `WebSite`/`Organization`/`WebApplication` (4).
- [x] Contentblok op `/lootjes-trekken` en `/verlanglijstje-maken` (5).

### Fase 2 — vóór volgend seizoen (Q1–Q3 2027)

- [x] Seizoens- en doelgroeplandingspagina’s uit 5; `paths.ts` per-locale optioneel.
- [x] Uitgebreide helpvragen (6 zoekintentievragen toegevoegd op 21 november 2026), [ ] interne linkstructuur.
- [ ] Eerste externe vermeldingen: lijsten met Sinterklaas-/kerstgidsen, familie- en teamblogs, Product Hunt/vergelijkingssites voor tools; persberichten rond de lancering. Spreek geen “gratis”-claim uit zonder besluit. *Gestart op 18–19 november 2026: directory-aanmeldingen en redactionele pitches staan, met status en open punten, in `docs/EXTERNAL_LISTINGS.md`.*

### Fase 3 — doorlopend

- [x] Core Web Vitals meten: anonieme tellers in `/admin/usage` (21 november 2026). Caching van de publieke pagina’s heroverwogen: de HTML blijft dynamisch (CSP-nonce per verzoek), de themainstellingen worden per serverinstantie 60 seconden onthouden. Open: PageSpeed/CrUX-nulmeting.
- [ ] Maandelijks Search Console (draaiboek: `docs/SEARCH_CONSOLE_ROUTINE.md`): queries, CTR per titel (A/B via herschrijven), indexatiedekking, hreflang-rapport (Google heeft het rapport verwijderd; controleer via een crawler zoals Screaming Frog).
- [x] Seizoensgebonden ververs: beschrijvingen van home en loting-pagina volgen het actieve thema (Sinterklaas/kerst); titels blijven het hele jaar gelijk; OG-afbeelding volgt het thema. Controleer elk jaar eind september of de planning in het beheer klopt.

## 8. KPI’s

| Doel | Meetpunt | Basis (nu) | Streefwaarde |
|------|----------|-----------|--------------|
| Indexering | Pagina’s “Geïndexeerd” in Search Console per domein | Onbekend, `.nl`-lootjespagina gefilterd door robots | 6/6 publieke pagina’s per domein |
| Zichtbaarheid | Vertoningen en positie voor “lootjes trekken”, “verlanglijstje maken”, “secret santa generator” | 0 / onbekend | Top-20 binnen 3 maanden na publieke lancering, top-10 binnen 9 |
| Klikratio | CTR op titels | n.v.t. | ≥ 3 % gemiddeld voor non-brand |
| Conversie | Gemaakte lijsten/loten per organische sessie | n.v.t. | Eerst meten, dan norm stellen |
| Delen | Aandeel verkeer via WhatsApp/social met correcte kaart | n.v.t. | Controle via de Facebook Sharing Debugger |

## 9. Niet doen

- Geen keywordstuffing in titels of verborgen tekst.
- Geen automatische vertaling van gebruikerscontent (blijft zoals ingevoerd, zie `LOCALIZATION.md`).
- Privépagina’s (`/lootje`, `/draw/reveal`, beheer, gast-lijst) nooit indexeerbaar of in de sitemap maken; persoonlijke links zijn geheimen.
- Geen aparte pagina’s per taal op dezelfde URL; één URL = één taal.
