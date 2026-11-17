# Lijstjes en lootjes — MVP

De vaste projectcontext staat in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). De gekozen visuele richting, inclusieve representatieregels en het uitvoeringsplan staan in het [designhandboek](DESIGN.md). De grens tussen Engelse interne code en vertaalde interfaces staat in [LOCALIZATION.md](LOCALIZATION.md).

Een reviewbare Next.js/TypeScript-uitwerking van de productbriefing van 16 november 2026. De drie routes zijn zelfstandig bruikbaar:

- `/verlanglijstje-maken`: lijst maken, beheer- en gastenlink, wensen aanpassen, atomisch reserveren en eigen reservering herstellen.
- `/lootjes-trekken`: deelnemers, wederzijdse uitsluitingen, cryptografische trekking, persoonlijke links en een eigen wensenlijstje per deelnemer zonder reserveringen.
- `/rad-draaien`: secundaire, volledig browserlokale tool met onbevooroordeelde cryptografische keuze, reduced-motionondersteuning en delen/kopiëren.

## Lokaal starten

```bash
npm install
npm run dev
```

Open daarna [http://localhost:3000](http://localhost:3000).

Kwaliteitscontroles:

```bash
npm test
npm run typecheck
npm run build
```

## Vercel-setup

De lokale map is gekoppeld aan het Vercel-project `ludo-raedts-projects/lijstjes-en-lootjes`. Het project gebruikt het Next.js-framework en Node.js 24.x. De Supabase-resource `lijstjes-en-lootjes-db` draait op het gratis plan in Frankfurt en is aan alle Vercel-omgevingen gekoppeld. Lokale Vercel-instellingen en omgevingswaarden staan in genegeerde bestanden; `.env.example` bevat alleen lege voorbeelden.

Er is geen productiedeployment. De huidige Vercel-preview is afgeschermd met Vercel-authenticatie, wordt automatisch niet geïndexeerd en is end-to-end gecontroleerd op de homepage, navigatie, verlanglijsten, reserveringen, sessies, lootjestrekking en de gekoppelde deelnemerslijstjes.

## Domeinen

- Primair domein: `lijstjesenlootjes.nl` (geregistreerd bij Vimexx, 17 november 2026). Stel `NEXT_PUBLIC_SITE_URL=https://lijstjesenlootjes.nl` in voor Production.
- `www.lijstjesenlootjes.nl` verwijst permanent door naar de kale domeinnaam (`next.config.ts`).
- `wishanddraw.com` is gereserveerd voor de toekomstige Engelse versie en verwijst voorlopig tijdelijk (307) door naar het `.nl`-domein.
- Vercel-domeinkoppeling: `vercel domains add` of via het dashboard; DNS-records komen van Vercel. Zet DNSSEC bij de registrar uit voordat nameservers worden gewijzigd.

## Opslagarchitectuur

De server bewaart records in een afgeschermde Supabase/PostgreSQL-tabel. Alleen servercode met de geheime Supabase-sleutel kan twee `security definer`-functies aanroepen; browser- en anon-sleutels hebben geen toegang. Schrijfacties gebruiken optimistic concurrency control, zodat twee gelijktijdige reserveringen niet allebei kunnen slagen. Het schema staat in `supabase/migrations/20261116220000_app_state.sql`.

Capabilitytokens bevatten 256 bits willekeur en worden alleen als SHA-256-hash opgeslagen. De ruwe token staat in het URL-fragment en wordt via een same-origin POST verruild voor een HttpOnly/SameSite-sessiecookie. Persoonlijke routes hebben `noindex`, `no-store` en `Referrer-Policy: no-referrer`.

## Bewuste beperkingen

- Nog geen definitief verwijder- en back-upbeleid; de Supabase-tabel gebruikt wel RLS zonder publieke policies.
- Geen e-mailprovider; de UI claimt nergens dat e-mail is verzonden.
- Nog geen publieke deployment, domeinregistratie, analytics of externe scripts.
- Geen herstelroute wanneer een beheerlink verloren is.
- De oorspronkelijke persoonlijke lootjeslink is na uitgifte niet terug te halen; beheer kan een nieuwe link maken en de oude intrekken.
- Een bestaand los verlanglijstje kan nog niet aan een trekking worden gekoppeld; deelnemers maken binnen de trekking een eigen lijstje.

Gebruik voorlopig alleen verzonnen testgegevens. Voor publieke ingebruikname zijn privacy- en bewaarkeuzes, abusepreventie, monitoring, e-mailtests en aanvullende end-to-endgebruikerstests nog vereist.
