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

## Seasonal themes and administration

The homepage appearance is resolved server-side from the active locale and the Europe/Amsterdam calendar. The built-in schedule uses Sinterklaas for Dutch visitors from 15 November through 5 December, Christmas for Dutch visitors from 6 through 26 December, and Christmas for English visitors from 15 November through 26 December. Outside those windows, winter, spring, summer, and autumn follow the configured month/day boundaries. Neutral is available as a manual theme but is not selected by the default automatic calendar.

Every theme has desktop and mobile AVIF hero art, semantic color tokens, two SVG motifs, and a preferred layout. The layout engine supports `editorial`, `split`, and `showcase` while preserving one accessible HTML content order. On narrow screens, all three compositions collapse to the same stable mobile flow.

Open `/admin` to inspect the resolved appearance, choose automatic or manual theme selection, override the preferred layout, and adjust the locale-specific holiday windows. The route requires these server-only environment variables:

```bash
THEME_ADMIN_PASSWORD=
THEME_ADMIN_SESSION_SECRET=
```

The password must contain at least 12 characters and the signing secret at least 32 characters. Authentication uses a signed, HttpOnly, SameSite-strict session cookie with a 12-hour lifetime and an in-memory login-attempt limiter. Theme settings are stored as an optional `siteSettings.theme` object in the existing private versioned Supabase application-state document; no public database access or schema migration is required. `/admin` responses are `no-store` and `noindex`.

## Vercel-setup

De lokale map is gekoppeld aan het Vercel-project `ludo-raedts-projects/lijstjes-en-lootjes`. Het project gebruikt het Next.js-framework en Node.js 24.x. Het enige databaseproject is `lijstjes-en-lootjes` (`wvbcvctcgrrouzkmxzgh`) in de gratis Supabase-organisatie `Lijstjes en Lootjes`, regio Frankfurt. Vercel gebruikt in Production, Preview en Development alleen `SUPABASE_URL` en `SUPABASE_SECRET_KEY`. Lokale Vercel-instellingen en omgevingswaarden staan in genegeerde bestanden; `.env.example` bevat alleen lege voorbeelden.

De GitHub-repository `ludo-raedts/lijstjesenlootjes` is aan Vercel gekoppeld. Een push naar `main` start automatisch een productiedeployment. De actieve productieversie is bereikbaar via `https://lijstjes-en-lootjes.vercel.app`; de publieke routes en de serververbinding met Supabase zijn gecontroleerd. Previewdeployments blijven automatisch buiten zoekmachines.

## Domeinen

- Primair domein: `lijstjesenlootjes.nl` (geregistreerd bij Vimexx, 17 november 2026) en als productiedomein aan Vercel gekoppeld.
- `www.lijstjesenlootjes.nl` verwijst permanent door naar de kale domeinnaam (`next.config.ts`).
- `wishanddraw.com` toont dezelfde app met Engels als standaardtaal; de URL blijft `wishanddraw.com` (geen redirect). `www.wishanddraw.com` verwijst permanent naar de kale naam.
- De standaardtaal volgt het domein (`src/lib/domains.ts`); een expliciete taalkeuze van de bezoeker (cookie `ll_locale`) wint. Canonical-URL, sitemap, robots en `hreflang`-Link-headers (`next.config.ts`) zijn per domein. De paden zijn nog Nederlands (bijv. `/verlanglijstje-maken`) tot de locale-routing uit `LOCALIZATION.md` fase 3 is gebouwd.
- De DNS-records wijzen naar Vercel. DNS-propagatie en de uitgifte van het TLS-certificaat kunnen direct na registratie of een DNS-wijziging nog enige tijd duren.

## Opslagarchitectuur

De server bewaart records in een afgeschermde Supabase/PostgreSQL-tabel. Alleen servercode met de geheime Supabase-sleutel kan twee `security definer`-functies aanroepen; browser- en anon-sleutels hebben geen toegang. Schrijfacties gebruiken optimistic concurrency control, zodat twee gelijktijdige reserveringen niet allebei kunnen slagen. Het schema staat in `supabase/migrations/20261116220000_app_state.sql`.

Capabilitytokens bevatten 256 bits willekeur en worden alleen als SHA-256-hash opgeslagen. De ruwe token staat in het URL-fragment en wordt via een same-origin POST verruild voor een HttpOnly/SameSite-sessiecookie. Persoonlijke routes hebben `noindex`, `no-store` en `Referrer-Policy: no-referrer`.

## Bewuste beperkingen

- Nog geen definitief verwijder- en back-upbeleid; de Supabase-tabel gebruikt wel RLS zonder publieke policies.
- Geen e-mailprovider; de UI claimt nergens dat e-mail is verzonden.
- De productiedeployment is publiek bereikbaar, maar blijft voorlopig een besloten proefversie; er zijn nog geen analytics of externe scripts.
- Geen herstelroute wanneer een beheerlink verloren is.
- De oorspronkelijke persoonlijke lootjeslink is na uitgifte niet terug te halen; beheer kan een nieuwe link maken en de oude intrekken.
- Een bestaand los verlanglijstje kan nog niet aan een trekking worden gekoppeld; deelnemers maken binnen de trekking een eigen lijstje.

Gebruik voorlopig alleen verzonnen testgegevens. Voor publieke ingebruikname zijn privacy- en bewaarkeuzes, abusepreventie, monitoring, e-mailtests en aanvullende end-to-endgebruikerstests nog vereist.
