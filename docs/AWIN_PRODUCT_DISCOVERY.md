# Visual product discovery with Awin (design proposal)

Status: proposal, nothing built. Replaces the curated-ideas-only approach in `WishIdeas.tsx` once a real feed exists.
Facts about Awin's feed formats, API limits, image-use and caching terms are **unverified** and listed as gates below.

## Goal

A visitor opens "Find a gift", sees real products with photos, and puts one on their list with a single tap, on
mobile first, in the visitor's own country and language. Adding stays a plain, editable wish.

## Principles (from existing project rules)

- No account, no trackers, no personal data in third-party requests.
- A wish is user content: adding a product never locks or rewrites it; affiliate links are applied at display time.
- Curated ideas stay as the fallback and for general inspiration; products are an explicit, separate choice.
- Affiliate off-switch per programme and per host/locale, like `BOL_PROGRAMS`.
- Dutch is the default locale, not the internal language: code, fields and logs in English; copy in catalogs.

## Experience

Entry point: a prominent "Find a gift" button above the wish rows (opens a full-height sheet on mobile, inline panel on
desktop). Not a collapsed `<details>`.

1. Search field (autofocus on open), category chips (little gifts, kids, teens, cosy, food, outdoors), optional budget.
2. Results grid: 2 columns on mobile, 3-4 on desktop. Each card: photo (4:3, lazy), product name, shop name, price with
   "price on {date}" when shown, and one primary button "+ Add".
3. Tap "+ Add": the wish row is filled (title, link, price text, image reference) and the sheet stays open with the card
   marked "On your list" so several can be added in a row. Announce through a live region.
4. Wish rows with a product show a small thumbnail; the visitor can still edit title, note and price, or remove it.
5. Empty state or no feed: curated ideas (today's behaviour) and "add a wish of your own".

Guest views and draw reveals show the thumbnail next to the wish and a "View in shop" link marked as an advertisement.

## Data model

Extend `Wish` and `DrawWish` (`src/lib/types.ts`) with an optional, validated block; old wishes keep working.

```
product?: {
  source: "awin";
  programmeId: string;   // allow-listed
  offerId: string;       // id in our own offer table, not a raw feed URL
  imagePath?: string;    // path in our image proxy, never a third-party URL
}
```

`url` keeps the plain merchant product URL. The API validates `product` against the allow-list and ignores unknown
fields. Persisted values are language-neutral English identifiers.

## Server side

1. **Offer index.** A nightly job (Vercel Cron) fetches the approved programmes' feeds and upserts a table
   `product_offers` (programme, offer id, title, brand, category, price, currency, merchant URL, image URL, country,
   language, updated_at). Offers not seen for 2 runs are deleted. Only approved programmes and countries are stored.
   Rows are catalogue data, not user data, so they do not belong in the private application-state document: new
   migration under `supabase/migrations/`.
2. **Search endpoint** `GET /api/products/search?q=&category=&maxPrice=`: Postgres full-text or trigram search on
   `product_offers`, scoped by the request host's programmes and locale, rate limited, max 24 results, English error
   codes, `Cache-Control` short. The query is not logged, matching existing log rules.
3. **Image proxy** via `next/image` with `remotePatterns` limited to approved image hosts, so the browser only talks to
   our own origin (`img-src 'self'` stays; no visitor IP reaches shops). Fall back to a neutral placeholder.
4. **Links.** Stored plain; wrapped into an Awin deep link when displayed, next to `wrapBolUrl`, with a campaign label
   and no visitor identifiers. Disclosure text per programme in the catalogs.

## Domains, languages and programmes

A config like `BOL_PROGRAMS`: `{ siteHost, locales, programmeId, awinMerchantId, enabled }`.

- `lijstjesenlootjes.nl` (nl): bol stays the curated, own-programme integration; Awin programmes added as they are approved
  (Proshop, ANWB, ICI PARIS XL are pending).
- `wishanddraw.com` (en): no Awin programme chosen yet; Amazon search stays. Choose programmes with international
  delivery and show the shop and country on each card.
- Each programme has its own kill switch env var and a documented terms check before enabling.

## Privacy and security

- Search terms go to our server only, never to Awin or shops; no query logging; no query in analytics.
- Remote image hosts are an allow-list; `product.imagePath` is never a free URL (no SSRF/open proxy).
- Offer text from feeds is untrusted: render as text, length-limited, no HTML.
- Aggregate counters only for success events (e.g. `product_added`), no search terms.
- Privacy statement updated before launch: search is processed on our server, images come through our domain, links are
  affiliate links.

## Accessibility (WCAG 2.2 AA)

- Cards are list items; the add button's accessible name starts with its visible text ("+ Add: {name}").
- Decorative photo gets `alt=""` because the name sits beside it; thumbnails in wish rows get the product name.
- Results count announced politely; focus returns to the search field on close; sheet traps focus and closes with Esc.
- Tap targets at least 44 px; price and "price on {date}" are real text; works without images.

## Phasing and gates

0. **Gates (before code):** approval for the first programme; written confirmation that feed data, prices and images may
   be stored/proxied and for how long; Awin deep-link format and allowed `clickref` use; privacy and disclosure wording.
1. **Spike (flag off by default):** one programme feed -> `product_offers` -> search endpoint -> card grid with the
   curated fallback. Unit tests for parsing, allow-list and validation; e2e for search+add on lists, manage, and draw.
2. **Images and thumbnails** in wish rows and guest views; CSP and placeholder checks; mobile visual check.
3. **More programmes and the English domain**, one at a time, each behind its own switch.
4. **Freshness:** nightly sync health in the admin usage page (counts only), stale-price handling, dead-offer removal.

## Open questions

- Does the Awin feed licence allow storing offers in our database and serving images through our domain?
- Is a feed (batch) or a search API available for these programmes, and what are its limits?
- Do we show prices at all? If yes: "price on {date}" and a refresh policy, or omit prices and let the shop show them.
- Programme choice for the English domain.
- Should the bol curated list also move into `product_offers` so one UI serves all shops?

## Gate checklist (fill in before building)

| # | Question | Where to find it | Answer | Date |
|---|---|---|---|---|
| 1 | Which programmes are approved for lijstjesenlootjes.nl and wishanddraw.com (status, countries)? | Awin account / MCP | | |
| 2 | Is a product feed or search API available per programme, in what format, how often updated, what limits? | Awin account / MCP, programme page | | |
| 3 | May feed data (titles, prices) be stored in our own database, and for how long? | Awin publisher terms + programme terms | | |
| 4 | May product images be proxied or cached on our domain, or must they be hotlinked? | Programme terms | | |
| 5 | May prices be shown, and with what freshness wording? | Programme terms | | |
| 6 | Deep-link format and allowed `clickref` content (no visitor identifiers) | Awin link builder docs | | |
| 7 | Is placing links inside user-created wishlists and name draws allowed? | Programme terms | | |
| 8 | Required disclosure wording per programme and country | Programme terms | | |
| 9 | International delivery and programmes for the English domain | Awin account / MCP | | |

## Gate findings (2026-11-18, read-only look in the Awin account and public terms)

- **Programmes (gate 1):** 0 joined, 3 pending (ANWB Webwinkel NL, ICI PARIS XL NL, Proshop NL), all NL and all with a product feed.
  Nothing is approved yet, so no licence to use any advertiser material exists today.
- **Feeds (gate 2):** Awin Create-a-Feed (feed list + per-feed download URL with a personal key; keep it server-side,
  never in client code or the repo). Proshop NL: ~233,849 products, updated hourly, 3% commission, 30-day cookie.
- **Awin Publisher Terms (AWIN AG, EN-UK, 2026), gates 3-5:** Advertiser Materials (text, images, data) may be published
  "without modification", only while approved in that programme and within its Programme Terms (cl. 4.2-4.4, 10.1); they
  must be reproduced "accurately and faithfully" (9.2.11) and removed immediately on request of Awin or the advertiser
  (4.6, 15.x). The terms say nothing explicit about storing feeds in a database or proxying images, so storage/caching,
  resizing and image proxying must be cleared per advertiser. The NL entity's own version of the terms was not read.
  Terms update on 2026-11-24.
- **Proshop NL Programme Terms (updated 2023-01-13):** no SEM/SEA, no Google Shopping/CSS, postview prohibited, forced
  clicks/iFrames/cookie stuffing prohibited; nothing on data storage, images or user-generated lists.
- **ANWB:** first page read only (paid search allowed with restrictions); the additional-terms page was not read.
- **ICI PARIS XL:** terms not read.
- **Still open:** gates 6-9 (deep-link/clickref format, user-created lists, disclosure wording, international programmes).
  Consequence for the design: wishes must keep working when a programme ends, so product data and images need a purge path.

### Programme terms read in full (2026-11-18, follow-up)

- **ANWB Webwinkel NL (terms of 2020-04-14):** allowed partner types include communities/UGC, shopping directory,
  comparison shopping/engine, content creators, linking via landing pages. Excluded: gambling and erotic sites.
  Commercial email only after approval through Awin's Email Approval Tool. Nothing on storing feeds or images.
- **ICI PARIS XL NL:** only for publishers with Dutch-language sites aimed primarily at the Dutch market (so not
  the English domain). A cookie-freeze script applies. Commercial email needs Email Approval Tool approval. Allowed
  types include communities/UGC, shopping directory, comparison. A separate "Voorwaarden Affiliate programma ICI PARIS
  XL" document under the programme's Documents tab was not opened. Nothing on storing feeds or images in the terms page.
- **Cross-cutting:** none of the three terms pages answers the storage/image-proxy/prices questions (gates 3-5);
  ask each advertiser in writing after approval. Our link-recovery and list mails must not carry advertiser links
  unless that mail is approved as email marketing; keep affiliate links out of mails.

### Gates 6-9 and feed mechanics (2026-11-18, from Awin's public help pages and the account's Link Builder)

Sources: help.awin.com developer docs (product feed publisher guide, click appends), success.awin.com (deep linking,
click reference, product data feed FAQ). Not checked in the signed terms; confirm per advertiser.

- **Deep link (6):** `https://www.awin1.com/cread.php?awinmid=<advertiser id>&awinaffid=<publisher id>&ued=<URL-encoded destination>`,
  with optional `clickref`. Our publisher id is 3158673; advertiser ids: Proshop 33751, ANWB 12984, ICI PARIS XL 16319.
  Product-feed links use `pclick.php` (feed column `aw_deep_link`); the exact feed-link format still needs the Column
  Descriptions page. The Link Builder in the account can also create deep links "even if you aren't partnered".
- **clickref (6):** up to 6 per link, 50 characters, lowercase Latin-1 alphanumerics, not `# + " ; & | '`. Advertisers
  see only `clickref` 1. Awin's own example uses a per-user id, but we must not: use a fixed campaign label only
  (e.g. `wishlist-guest`, `draw-reveal`), never a token, session or list id.
- **Feeds (2):** Create-a-Feed gives a feed list plus per-feed download URLs. Download only when the feed's "last update"
  is newer than the saved value; start downloads 10 s to 2 min after the hour/minute; retry after 5 min; at most 5
  concurrent downloads and 5 duplicate downloads per hour. Advertisers often update several times a day (Proshop hourly).
  Feeds include name, description, price (incl. discounts and shipping), images, and a deep link. Formats and exact
  columns are in the Column Descriptions page, not read yet.
- **Images (4):** Awin offers a resize-and-caching service (`awin_image_url`, `awin_thumb_url`, derived from the
  merchant image URL). Using it would avoid our own resizing ("without modification") but still loads images from an
  Awin domain, so the visitor's IP reaches Awin. Whether Awin's cache or our proxy is allowed is still to be confirmed.
- **User-created lists (7):** no rule found; the three programmes allow communities/UGC and shopping directories as
  partner types (ICI and ANWB), Proshop lists social traffic and content. Confirm in writing.
- **Disclosure (8):** Awin requires publishers to make advertising clear; Dutch practice is a visible "advertentie" or
  "partnerlink" label near the link. Awin Benelux also expects compliance with Dutch email rules (art. 11.7
  Telecommunications Act) for any commercial email. The current disclosure text under lists and in the footer is the
  baseline; the ACM's own affiliate wording was not retrieved.
- **International (9):** the three open programmes are NL-only. Nothing found yet for the English domain; needs a
  directory search by region (Awin directory, region filter) once a target country is chosen.
- **Price freshness (5):** no rule found in Awin's help pages; the FAQ is silent on stale prices. Treat prices as
  informational ("price on {date}") until an advertiser says otherwise.
