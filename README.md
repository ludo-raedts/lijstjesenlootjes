# Lijstjes en lootjes — MVP

De vaste projectcontext staat in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). De gekozen visuele richting, inclusieve representatieregels en het uitvoeringsplan staan in het [designhandboek](DESIGN.md). De grens tussen Engelse interne code en vertaalde interfaces staat in [LOCALIZATION.md](LOCALIZATION.md). De releasevolgorde en volgende productfasen, inclusief bol/Amazon-affiliates, staan in [ROADMAP.md](ROADMAP.md).

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

The password must contain at least 12 characters and the signing secret at least 32 characters. Authentication uses a signed, HttpOnly, SameSite-strict session cookie with a 12-hour lifetime. Login attempts share the same durable Supabase rate limiter as the public write APIs: eight attempts per hashed identifier in 15 minutes. Theme settings are stored as an optional `siteSettings.theme` object in the existing private versioned Supabase application-state document. `/admin` responses are `no-store` and `noindex`.

## Vercel-setup

De lokale map is gekoppeld aan het Vercel-project `ludo-raedts-projects/lijstjes-en-lootjes`. Het project gebruikt het Next.js-framework en Node.js 24.x. Het enige databaseproject is `lijstjes-en-lootjes` (`wvbcvctcgrrouzkmxzgh`) in de gratis Supabase-organisatie `Lijstjes en Lootjes`, regio Frankfurt. Vercel gebruikt in Production, Preview en Development alleen `SUPABASE_URL` en `SUPABASE_SECRET_KEY`. Lokale Vercel-instellingen en omgevingswaarden staan in genegeerde bestanden; `.env.example` bevat alleen lege voorbeelden.

De GitHub-repository `ludo-raedts/lijstjesenlootjes` is aan Vercel gekoppeld. Een push naar `main` start automatisch een productiedeployment. De actieve productieversie is bereikbaar via `https://lijstjes-en-lootjes.vercel.app`; de publieke routes en de serververbinding met Supabase zijn gecontroleerd. Previewdeployments blijven automatisch buiten zoekmachines.

## Domeinen

- Primair domein: `lijstjesenlootjes.nl` (geregistreerd bij Vimexx, 17 november 2026) en als productiedomein aan Vercel gekoppeld.
- `www.lijstjesenlootjes.nl` verwijst permanent door naar de kale domeinnaam (`next.config.ts`).
- `wishanddraw.com` toont dezelfde app met Engels als standaardtaal; de URL blijft `wishanddraw.com` (geen redirect). `www.wishanddraw.com` verwijst permanent naar de kale naam.
- De standaardtaal volgt het domein (`src/lib/domains.ts`); een expliciete taalkeuze van de bezoeker (cookie `ll_locale`) wint voor de taal van de tekst. Canonical-URL, sitemap, robots en `hreflang`-Link-headers (`next.config.ts`) zijn per domein.
- De paden volgen het domein, niet de cookie. Alle paden staan in één getypeerde module, `src/lib/paths.ts`: `lijstjesenlootjes.nl` gebruikt de Nederlandse paden (`/verlanglijstje-maken`, `/lootjes-trekken`, `/rad-draaien`, `/verlanglijstje/beheren`, `/verlanglijstje/bekijken`, `/trekking-beheren`, `/lootje`), `wishanddraw.com` de Engelse (`/wishlist-maker`, `/secret-santa-generator`, `/name-wheel`, `/wishlist/manage`, `/wishlist/view`, `/draw/manage`, `/draw/reveal`). `/help` en `/privacy` zijn gedeeld. De routemappen in `src/app` blijven Nederlands; `wishanddraw.com` serveert de Engelse paden via host-gebonden rewrites (de URL blijft Engels). Het pad van de andere taal geeft op elk domein een permanente redirect (308) naar het eigen pad, zodat eerder uitgedeelde links blijven werken; hernoemde paden (`legacyPaths` in `PAGES`: `/create-wishlist`, `/draw-names`, `/spin-the-wheel`) redirecten permanent naar het nieuwe pad; het `#token=…`-fragment blijft behouden. Persoonlijke links die de API uitgeeft gebruiken het pad van het domein waarop het verzoek binnenkwam.
- Sitemap, `hreflang` (nl ↔ en met het juiste pad per domein, `x-default` = `.nl`), robots.txt en de proxy-matcher (`src/proxy.ts`, letterlijke lijst met een test die de overeenkomst met `paths.ts` bewaakt) komen uit of worden bewaakt door dezelfde padentabel. Een nieuw pad toevoegen: eerst in `PAGES`, dan de proxy-matcher bijwerken als het privé is.
- De DNS-records wijzen naar Vercel. DNS-propagatie en de uitgifte van het TLS-certificaat kunnen direct na registratie of een DNS-wijziging nog enige tijd duren.

## Opslagarchitectuur

De server bewaart records in een afgeschermde Supabase/PostgreSQL-tabel. Alleen servercode met de geheime Supabase-sleutel kan de `security definer`-functies voor lezen, schrijven en rate limiting aanroepen; browser- en anon-sleutels hebben geen toegang. Schrijfacties gebruiken optimistic concurrency control, zodat twee gelijktijdige reserveringen niet allebei kunnen slagen. De schemawijzigingen staan in `supabase/migrations/`.

Capabilitytokens bevatten 256 bits willekeur en worden alleen als SHA-256-hash opgeslagen. De ruwe token staat in het URL-fragment en wordt via een same-origin POST verruild voor een HttpOnly/SameSite-sessiecookie. Persoonlijke routes hebben `noindex`, `no-store` en `Referrer-Policy: no-referrer`.

## End-to-end tests

```bash
npm run test:e2e
```

De suite (`e2e/`, Playwright met het geïnstalleerde Google Chrome) bouwt de app en draait die tegen een in-memory Supabase-nabootsing (`e2e/mock-supabase.mjs`). Alle omgevingswaarden worden expliciet meegegeven, dus `.env.local` kan de tests nooit naar een echte database laten wijzen; alle geheimen zijn wegwerpwaarden. Chrome koppelt `lijstjesenlootjes.nl` en `wishanddraw.com` aan 127.0.0.1, zodat elke test in beide talen via het echte domein draait (project `nl` en `en`). Een kleine testproxy (`e2e/proxy.mjs`) vervangt wat Vercel normaal doet: de same-origin-controle en het Secure-attribuut van cookies onder `next start`.

Gedekt: homepage, mobiel menu, taalwissel en Engelse paden; verlanglijstje maken, bewerken, delen, reserveren, vrijgeven en verwijderen; trekking met uitsluiting en dubbele namen, persoonlijke links, eigen wensen, link vervangen en verwijderen; admin-login, rate limiting, thema en layout opslaan, uitloggen; health- en cleanup-endpoint; axe (WCAG 2.2 AA) op openbare en persoonlijke pagina's bij 1280, 640 (200% zoom) en 320 px; toetsenbordbediening en gereduceerde beweging.

## Health en incidenten

`GET /api/health` geeft `200` (`ok`) of `503` (`degraded`) en toont nooit data of foutdetails; het controleert alleen de databaseverbinding via de RPC `app_health` (migratie `20261117160000_app_health.sql`, eerst toepassen). Zie [INCIDENT_PLAYBOOK.md](INCIDENT_PLAYBOOK.md) voor detectie, containment en het roteren van sleutels.

## Bewuste beperkingen

- Handmatig verwijderen wist een verlanglijstje of trekking met alle bijbehorende tokens en sessies direct. Een dagelijkse Vercel Cron-job (`/api/cron/cleanup`, `vercel.json`, beveiligd met `CRON_SECRET`) verwijdert verlopen scopes: trekkingen 45 dagen na de datum of 90 dagen na aanmaak zonder datum, verlanglijstjes 12 maanden na de laatste wijziging of reservering, plus verlopen of verweesde tokens en sessies (`src/lib/data-lifecycle.ts`). Het back-upbeleid is nog niet definitief vastgesteld; de Supabase-tabellen gebruiken RLS zonder publieke policies.
- Geen e-mailprovider; de UI claimt nergens dat e-mail is verzonden.
- De productiedeployment is publiek bereikbaar, maar blijft voorlopig een besloten proefversie; er zijn nog geen analytics of externe scripts.
- Geen herstelroute wanneer een beheerlink verloren is.
- De oorspronkelijke persoonlijke lootjeslink is na uitgifte niet terug te halen; beheer kan een nieuwe link maken en de oude intrekken.
- Een bestaand los verlanglijstje kan nog niet aan een trekking worden gekoppeld; deelnemers maken binnen de trekking een eigen lijstje.

Gebruik voorlopig alleen verzonnen testgegevens. Voor publieke ingebruikname zijn privacy- en bewaarkeuzes, aanvullende abusepreventie, monitoring, e-mailtests en aanvullende end-to-endgebruikerstests nog vereist.
