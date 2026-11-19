# Lijstjes en lootjes — MVP

De vaste projectcontext staat in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). De gekozen visuele richting, inclusieve representatieregels en het uitvoeringsplan staan in het [designhandboek](DESIGN.md). De grens tussen Engelse interne code en vertaalde interfaces staat in [LOCALIZATION.md](LOCALIZATION.md). De releasevolgorde en volgende productfasen, inclusief bol/Amazon-affiliates, staan in [ROADMAP.md](ROADMAP.md).

Een Next.js/TypeScript-uitwerking van de productbriefing van 16 november 2026. De drie routes zijn zelfstandig bruikbaar:

- `/verlanglijstje-maken`: lijst maken, beheer- en gastenlink, wensen aanpassen, atomisch reserveren en eigen reservering herstellen.
- `/lootjes-trekken`: deelnemers, wederzijdse uitsluitingen, cryptografische trekking, persoonlijke links en een eigen wensenlijstje per deelnemer zonder reserveringen. Een deelnemer kan ook een bestaand los verlanglijstje koppelen; de gever ziet dan de actuele wensen daarvan (nooit de reserveringen).
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
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

## Continuous integration

`.github/workflows/ci.yml` draait bij elke pull request en elke push naar `main`: typecheck en unit tests (job `checks`) en de volledige Playwright-suite in `nl` en `en` (job `e2e`, tegen de in-memory Supabase- en e-mailnabootsing, met wegwerpgeheimen; er zijn geen repository-secrets nodig). Bij een mislukte e2e-run worden de traces 7 dagen bewaard als artifact.

De repository is openbaar. Een ruleset (`Protect main`) op `main` verplicht werken via pull requests en laat die pas mergen als de checks `Lint, typecheck and unit tests` en `End-to-end (Playwright, nl + en)` zijn geslaagd; verwijderen en force-pushen zijn geblokkeerd. Werkwijze: branch maken, pushen, pull request openen, wachten op groene CI, mergen. Vercel deployt `main` na de merge en maakt een preview per pull request.

## Beheer van een trekking en lijstje

- **Deelnemers aanpassen:** de organisator kan namen toevoegen of weghalen of gewoon opnieuw trekken (`POST /api/draws/admin`, actie `redraw`, `src/lib/redraw.ts`). Er wordt voor iedereen opnieuw getrokken met de bestaande uitsluitingen (uitsluitingen van vertrokken mensen vervallen); bestaande links blijven werken, links van weggehaalden worden ingetrokken, iedereen krijgt `viewedAt` gewist en `redrawnAt` verschijnt als melding. Minimaal 3 en maximaal 50 deelnemers.
- **Notitie:** een vrij tekstveld (max 500 tekens) bij de trekking, zichtbaar voor alle deelnemers; instelbaar bij het maken en in het beheer.
- **Herinnering (opt-in):** één mail aan de organisator, drie dagen voor de datum (niet eerder dan vandaag), en alleen als dan nog niet iedereen zijn lootje heeft geopend. Het adres wordt met AES-256-GCM versleuteld (`src/lib/secret-box.ts`, sleutel `REMINDER_ENCRYPTION_KEY`, 32 bytes base64) en direct na het versturen gewist; ook een verlopen of onleesbare herinnering wordt gewist. De dagelijkse cron `/api/cron/reminders` (`vercel.json`, zelfde `CRON_SECRET`) verstuurt de mail met een nieuwe beheerlink. Zonder sleutel of e-mailconfiguratie is de optie verborgen.
- **Medebeheerders:** de eigenaar van een lijstje kan tot 5 extra beheerlinks maken (met optioneel een naam), die te zien zijn en altijd ingetrokken kunnen worden. De ruwe link wordt eenmalig getoond.
- **Gekoppeld lijstje verwijderd:** de deelnemer krijgt een melding en kan het ontkoppelen of een ander lijstje koppelen.
- **Duits:** een extra interfacetaal via de taalschakelaar (`DE`, cookie), zonder eigen domein en dus niet geïndexeerd; zie [LOCALIZATION.md](LOCALIZATION.md) voor wat vertaald is en de terugval op Engels.
- **Landingspagina’s:** `/lootjes-trekken-op-kantoor` (`/office-secret-santa`), `/kerst-lootjes-trekken` (alleen NL; EN valt terug op de generator) en `/verlanglijstje-voor-verjaardag` (`/birthday-wishlist`), allemaal via `AudiencePage` en de catalogus, met sitemap en hreflang uit `paths.ts`.

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

De lokale map is gekoppeld aan het Vercel-project `ludo-raedts-projects/lijstjes-en-lootjes`. Het project gebruikt het Next.js-framework en Node.js 24.x. Het enige databaseproject is `lijstjes-en-lootjes` (`wvbcvctcgrrouzkmxzgh`) in de gratis Supabase-organisatie `Lijstjes en Lootjes`, regio Frankfurt. De Functions draaien in Frankfurt (`regions: ["fra1"]` in `vercel.json`), naast de database. Vercel gebruikt in Production, Preview en Development alleen `SUPABASE_URL` en `SUPABASE_SECRET_KEY`. Lokale Vercel-instellingen en omgevingswaarden staan in genegeerde bestanden; `.env.example` bevat alleen lege voorbeelden.

De GitHub-repository `ludo-raedts/lijstjesenlootjes` is aan Vercel gekoppeld. Een push naar `main` start automatisch een productiedeployment. De actieve productieversie is bereikbaar via `https://lijstjes-en-lootjes.vercel.app`; de publieke routes en de serververbinding met Supabase zijn gecontroleerd. Previewdeployments blijven automatisch buiten zoekmachines.

## Domeinen

- Primair domein: `lijstjesenlootjes.nl` (geregistreerd bij Vimexx, 17 november 2026) en als productiedomein aan Vercel gekoppeld.
- `www.lijstjesenlootjes.nl` verwijst permanent door naar de kale domeinnaam (`next.config.ts`).
- `wishanddraw.com` toont dezelfde app met Engels als standaardtaal; de URL blijft `wishanddraw.com` (geen redirect). `www.wishanddraw.com` verwijst permanent naar de kale naam.
- De standaardtaal volgt het domein (`src/lib/domains.ts`); een expliciete taalkeuze van de bezoeker (cookie `ll_locale`) wint voor de taal van de tekst. Canonical-URL, sitemap, robots en `hreflang`-Link-headers (`next.config.ts`) zijn per domein.
- De paden volgen het domein, niet de cookie. Alle paden staan in één getypeerde module, `src/lib/paths.ts`: `lijstjesenlootjes.nl` gebruikt de Nederlandse paden (`/verlanglijstje-maken`, `/lootjes-trekken`, `/rad-draaien`, `/verlanglijstje/beheren`, `/verlanglijstje/bekijken`, `/trekking-beheren`, `/lootje`, `/beheerlink-kwijt`), `wishanddraw.com` de Engelse (`/wishlist-maker`, `/secret-santa-generator`, `/name-wheel`, `/wishlist/manage`, `/wishlist/view`, `/draw/manage`, `/draw/reveal`, `/recover-link`). `/help` en `/privacy` zijn gedeeld. De routemappen in `src/app` blijven Nederlands; `wishanddraw.com` serveert de Engelse paden via host-gebonden rewrites (de URL blijft Engels). Het pad van de andere taal geeft op elk domein een permanente redirect (308) naar het eigen pad, zodat eerder uitgedeelde links blijven werken; hernoemde paden (`legacyPaths` in `PAGES`: `/create-wishlist`, `/draw-names`, `/spin-the-wheel`) redirecten permanent naar het nieuwe pad; het `#token=…`-fragment blijft behouden. Persoonlijke links die de API uitgeeft gebruiken het pad van het domein waarop het verzoek binnenkwam.
- Sitemap, `hreflang` (nl ↔ en met het juiste pad per domein, `x-default` = `.nl`), robots.txt en de proxy-matcher (`src/proxy.ts`, letterlijke lijst met een test die de overeenkomst met `paths.ts` bewaakt) komen uit of worden bewaakt door dezelfde padentabel. Een nieuw pad toevoegen: eerst in `PAGES`, dan de proxy-matcher bijwerken als het privé is.
- De DNS-records wijzen naar Vercel. DNS-propagatie en de uitgifte van het TLS-certificaat kunnen direct na registratie of een DNS-wijziging nog enige tijd duren.

## Opslagarchitectuur

De server bewaart records in een afgeschermde Supabase/PostgreSQL-tabel. Alleen servercode met de geheime Supabase-sleutel kan de `security definer`-functies voor lezen, schrijven en rate limiting aanroepen; browser- en anon-sleutels hebben geen toegang. Schrijfacties gebruiken optimistic concurrency control, zodat twee gelijktijdige reserveringen niet allebei kunnen slagen. De schemawijzigingen staan in `supabase/migrations/`.

Capabilitytokens bevatten 256 bits willekeur en worden alleen als SHA-256-hash opgeslagen. De ruwe token staat in het URL-fragment en wordt via een same-origin POST verruild voor een HttpOnly/SameSite-sessiecookie. Persoonlijke routes hebben `noindex`, `no-store` en `Referrer-Policy: no-referrer`.

## Linkgeldigheid en invoerlimieten

Persoonlijke en gedeelde links zijn geldig zolang het lijstje of de trekking bestaat (`src/lib/data-lifecycle.ts`): een trekking verloopt 45 dagen na de datum, minimaal 30 dagen na het maken, en de links lopen daarin mee. De links van een lijstje schuiven mee met elke wijziging of reservering. Schrijf-API's lezen JSON met een groottelimiet (`readJson` in `src/lib/http.ts`; kapotte JSON geeft 400, te groot 413) en het aantal uitsluitingen is begrensd op n×(n−1), met ontdubbeling. Lukt willekeurig schudden niet voor een oplosbare trekking, dan bouwt `constructAssignments` alsnog een geldige verdeling.

De organisator kan in het beheer de datum van een trekking aanpassen (`PATCH /api/draws/admin`); alle nog geldige links van die trekking krijgen dan de nieuwe vervaldatum (`syncDrawAccess`). Het beheer toont tot wanneer de links werken. Een dode link (verlopen, vervangen of onbekend) krijgt per oorzaak een eigen foutcode (`access_link_expired`, `access_link_replaced`, `access_link_invalid`) en toont een uitleg met de juiste vervolgstap: organisatoren worden naar de herstelpagina gestuurd, deelnemers en gasten naar degene die de link deelde.

## Beveiligingsheaders

`src/proxy.ts` zet op elke pagina een Content-Security-Policy met een nonce per verzoek en `strict-dynamic` (geen `unsafe-inline` voor scripts, geen `unsafe-eval` in productie), `frame-ancestors 'none'` plus `X-Frame-Options: DENY` tegen framing, `X-Content-Type-Options`, een Permissions-Policy, `Cross-Origin-Opener-Policy` en HSTS (alleen over https). Privé-pagina's krijgen `Referrer-Policy: no-referrer`, de rest `strict-origin-when-cross-origin`; API-antwoorden krijgen `default-src 'none'`. De regels staan in `src/lib/security-headers.ts`. Stijlen mogen inline blijven omdat React `style`-attributen gebruikt. De e2e-suite (`e2e/security.spec.ts`) controleert de headers en dat geen enkele pagina, interactie of formulier een CSP-overtreding geeft. De eigen bezoekmeting gebruikt alleen `/api/traffic`; iedere externe bron moet bewust in de policy worden toegestaan.

## Gebruiksdashboard

De eigen bezoekmeting draait alleen in de echte Vercel-productieomgeving. `PublicTrafficMeasurement` zet openbare routes uit `src/lib/paths.ts` om in vaste, taalneutrale paginanamen en stuurt alleen die paginanaam plus een boolean voor een eerste bezoek naar `/api/traffic`. Een bezoek is de eerste openbare pagina per browsertab en Amsterdamse kalenderdag. `sessionStorage` bewaart tijdelijk de dag en aantallen per vaste paginanaam, zonder ID of URL. Opent dezelfde tab `/admin` of een onderliggende pagina, dan trekt `/api/traffic/exclude` die tellingen weer af, wist de tab het lokale teloverzicht en meet hij die dag niet verder. De fetches gebruiken geen referrer; volledige URL's, queryparameters, fragmenten, IP-adressen, apparaatkenmerken en user-generated content worden niet in de meettabel bewaard. De API leest alleen Vercels globale `x-vercel-ip-country`-landcode, nooit stad, regio of coördinaten, en bewaart die in een aparte dagtabel per domein. Persoonlijke, beheer-, herstel-, admin- en onbekende routes leveren geen meting op. Lokale en previewdeployments laden de component niet.

`/admin/usage` (achter dezelfde login als `/admin`) toont openbare bezoeken en paginaweergaven per domein en pagina voor de laatste 30 dagen, plus landen per domein. Landen met minder dan vijf bezoeken en onbekende landcodes worden bij weergave samengevoegd als `Overig/onbekend`; VPN's en proxies kunnen de landschatting vertekenen. Daarnaast toont het dashboard anonieme actietellers voor 30 en 90 dagen en dezelfde 30 kalenderdagen van het vorige jaar. De acties zijn: lijstjes en trekkingen gemaakt, gedeelde lijstjes geopend, reserveringen, uitgegeven en geopende persoonlijke lootjeslinks, en beheerinlogs. Ook toont het dashboard wat er nu is opgeslagen (aantallen, oudste datum, binnenkort verlopend). Er worden nooit namen, wensen, links, tokens of individuele bezoekerskenmerken getoond of bewaard. Een nieuwe openbare pagina hoeft geen migratie meer: de databasecheck bewaakt alleen de vorm van de paginasleutel (migratie `20261119100000`; de landingspagina's kantoor, kerst en verjaardag werden daarvoor met fout 23514 geweigerd). De tellers staan in `app_private.traffic_daily`, `app_private.country_traffic_daily` en `app_private.usage_daily` (migraties in datumvolgorde toepassen), worden 25 maanden bewaard en per dag in Europe/Amsterdam-tijd geteld. De dagelijkse cleanup verwijdert oudere meetgegevens. Een mislukte teller laat de actie van de gebruiker nooit falen.

## End-to-end tests

```bash
npm run test:e2e
```

De suite (`e2e/`, Playwright met het geïnstalleerde Google Chrome) bouwt de app en draait die tegen een in-memory Supabase-nabootsing (`e2e/mock-supabase.mjs`). Alle omgevingswaarden worden expliciet meegegeven, dus `.env.local` kan de tests nooit naar een echte database laten wijzen; alle geheimen zijn wegwerpwaarden. Chrome koppelt `lijstjesenlootjes.nl` en `wishanddraw.com` aan 127.0.0.1, zodat elke test in beide talen via het echte domein draait (project `nl` en `en`). De e-mailprovider wordt vervangen door dezelfde nabootsing (`EMAIL_API_URL`), die elke mail vastlegt zodat tests de inhoud kunnen lezen; er gaat nooit iets naar Resend. Een kleine testproxy (`e2e/proxy.mjs`) vervangt wat Vercel normaal doet: de same-origin-controle en het Secure-attribuut van cookies onder `next start`.

Gedekt: homepage, mobiel menu, taalwissel en Engelse paden; verlanglijstje maken, bewerken, delen, reserveren, vrijgeven en verwijderen; trekking met uitsluiting en dubbele namen, persoonlijke links, eigen wensen, link vervangen en verwijderen; e-mail op de achtergrond met status, herstel van beheerlinks (ook voor onbekende adressen en zonder opt-in), datum verschuiven met alle links, voortgang en herinneringen, een los lijstje koppelen aan een trekking en de uitleg bij dode links; admin-login, rate limiting, thema en layout opslaan, uitloggen; health- en cleanup-endpoint; axe (WCAG 2.2 AA) op openbare en persoonlijke pagina's bij 1280, 640 (200% zoom) en 320 px; toetsenbordbediening en gereduceerde beweging.

## Health en incidenten

`GET /api/health` geeft `200` (`ok`) of `503` (`degraded`) en toont nooit data of foutdetails; het controleert alleen de databaseverbinding via de RPC `app_health` (migratie `20261117160000_app_health.sql`, eerst toepassen). Zie [INCIDENT_PLAYBOOK.md](INCIDENT_PLAYBOOK.md) voor detectie, containment en het roteren van sleutels.

## Bewuste beperkingen

- Handmatig verwijderen wist een verlanglijstje of trekking met alle bijbehorende tokens en sessies direct. Een dagelijkse Vercel Cron-job (`/api/cron/cleanup`, `vercel.json`, beveiligd met `CRON_SECRET`) verwijdert verlopen scopes: trekkingen 45 dagen na de datum of 90 dagen na aanmaak zonder datum, verlanglijstjes 12 maanden na de laatste wijziging of reservering, plus verlopen of verweesde tokens en sessies (`src/lib/data-lifecycle.ts`). Het back-upbeleid is nog niet definitief vastgesteld; de Supabase-tabellen gebruiken RLS zonder publieke policies.
- E-mail is optioneel (Resend, `src/lib/email.ts`, `src/lib/email-delivery.ts`). De mail gaat na het antwoord de deur uit (`after()`), met twee herhaalpogingen bij tijdelijke fouten (429/5xx/netwerk) en een vaste idempotency-key, zodat er hooguit één mail aankomt. Het adres wordt gebruikt voor die ene verzending en niet opgeslagen of gelogd; alleen de status (`queued`, `sent`, `failed` plus tijdstip) komt op de trekking of het lijstje en staat in het beheer. Vanuit het beheer kan de organisator een nieuwe beheerlink naar een adres mailen. Zonder `EMAIL_PROVIDER_API_KEY` en `EMAIL_FROM` wordt niets verzonden. SPF, DKIM en DMARC staan voor beide verzenddomeinen. Afleveruitkomsten komen binnen via de Resend-webhook `POST /api/webhooks/resend` (Svix-handtekening, `RESEND_WEBHOOK_SECRET`; events `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`) en worden als anonieme dagtellers getoond in `/admin/usage`; adressen worden nooit gelezen of bewaard en een opnieuw aangeboden event kan dubbel tellen. Een mislukte verzending logt de naam van de providerfout en het verzenddomein, nooit een adres.
- Herstel van een verloren beheerlink is opt-in (`src/lib/recovery.ts`, `POST /api/recovery`, pagina `/beheerlink-kwijt`). Alleen als de organisator dat aanvinkt bewaren we een gesleutelde HMAC-SHA256 van het genormaliseerde adres (`recoveryHash`), nooit het adres zelf. Een herstelverzoek geeft altijd hetzelfde 202-antwoord, ongeacht of het adres bekend is; matchen, nieuwe links aanmaken en mailen gebeuren pas na het antwoord. Beperkt tot 10 verzoeken per uur per IP en 3 per uur per adres. Nieuwe links komen erbij; bestaande blijven werken, zodat een vreemde die een adres intikt de echte organisator niet kan buitensluiten. Persoonlijke lootjeslinks zijn niet terug te halen; de organisator vervangt die in het beheer. De sleutel is `RECOVERY_HASH_SECRET`, met `SUPABASE_SECRET_KEY` als terugval: roteer je die laatste zonder eerste, dan matchen bestaande herstelhashes niet meer.
- Openbare pagina's gebruiken een eigen cookieloze dagteller in Supabase. Een bezoek is een privacyvriendelijke benadering per browsertab, niet een herkenbaar of uniek persoon. Persoonlijke en beheerpagina's worden niet gemeten.
- De oorspronkelijke persoonlijke lootjeslink is na uitgifte niet terug te halen; beheer kan een nieuwe link maken en de oude intrekken.
- Een gekoppeld los verlanglijstje wordt live getoond aan de gever. Wordt dat lijstje verwijderd, dan verdwijnen de wensen daaruit stilzwijgend bij de gever.
- De opslag is één versioned JSON-document met optimistic concurrency (jittered retries, `src/lib/backoff.ts`). Dat volstaat voor een pilot; het plan voor echte tabellen staat in [ROADMAP.md](ROADMAP.md).

Nog open vóór grootschalig gebruik: externe uptimemonitoring en deploy-alerts (zie [INCIDENT_PLAYBOOK.md](INCIDENT_PLAYBOOK.md)), een vastgesteld back-upbeleid en de opslagmigratie naar tabellen.
