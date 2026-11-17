# Product and delivery roadmap

Status date: 2026-11-17

This roadmap follows the product, design, localization, and deployment constraints in
`PROJECT_CONTEXT.md`, `DESIGN.md`, `LOCALIZATION.md`, and `README.md`.

## Current release candidate

Already implemented locally:

- Dutch and English interface architecture, including domain-based defaults.
- Responsive navigation and a verified 320 px layout.
- Neutral, Sinterklaas, Christmas, winter, spring, summer, and autumn artwork.
- Automatic seasonal scheduling plus protected manual theme and layout controls.
- Durable Supabase-backed rate limiting for public write actions, token exchange, and
  admin login. Identifiers are HMAC-hashed before storage.
- Physical deletion of wishlists and draws, including their access tokens and sessions.

Release order matters:

1. Review the local changes and decide how to handle the existing local commit.
2. Apply `supabase/migrations/20261117140000_rate_limits.sql` to the existing
   `lijstjes-en-lootjes` project. The application intentionally fails closed when this
   RPC is unavailable.
3. Configure the two theme-admin secrets through the approved Vercel workflow.
4. Run the production build and smoke tests again.
5. Push only after explicit approval. The push to `main` starts production deployment.
6. Verify both domains, both languages, the admin flow, list creation, draw creation,
   personal links, and physical deletion on the deployed version.

## Phase 1 — Public-pilot readiness

### 1. Decide and implement retention

**Status (2026-11-17): implemented** with the periods below. `updatedAt` is set on wishlist create, edit and reservation changes; `GET /api/cron/cleanup` (daily via `vercel.json`, Bearer `CRON_SECRET`) purges expired scopes in one transaction and logs counts only. Still open: document the backup deletion window.

Recommended starting policy:

- Sessions: 7 days, as currently implemented.
- Personal access links: 30 days, as currently implemented.
- Deleted wishlists and draws: remove immediately, as now implemented.
- Draws with an event date: remove 45 days after that date.
- Draws without an event date: remove 90 days after creation.
- Wishlists: remove after 12 months without an update.
- Rate-limit buckets: remove after 7 days, as implemented in the migration.

Required implementation after approval of these periods:

- Add `updatedAt` to wishlists and update it on every edit.
- Add a signed, idempotent cleanup job that deletes expired scopes and their tokens,
  sessions, reservations, and participant wishes in one transaction.
- Log counts only; never log names, wishes, raw links, tokens, IP addresses, or bucket
  keys.
- Update the privacy page from preview language to the final, concrete policy.
- Document how database backups affect the practical deletion window.

### 2. Monitoring and incident readiness

- Add a minimal health endpoint that checks application-to-database connectivity without
  returning database contents.
- Create alerts for elevated 5xx responses, failed Supabase RPC calls, and failed deploys.
- Use structured English event names and stable error codes.
- Redact request bodies, names, wishes, tokens, cookies, URLs, and client identifiers.
- Write a short incident playbook covering credential rotation, token revocation, and
  temporary write shutdown.

### 3. End-to-end quality gate

Automate these browser flows in both Dutch and English:

- Homepage, mobile menu, locale switch, and domain-default locale.
- Create, edit, share, reserve, release, and delete a wishlist.
- Create a draw with exclusions and duplicate display names.
- Exchange each personal link only once, reveal a draw, add personal wishes, replace a
  lost participant link, and delete the draw.
- Admin login, rate limiting, manual theme/layout save, automatic reset, and logout.
- Keyboard navigation, focus visibility, reduced motion, 200% zoom, 320 px layout, and
  axe-based accessibility checks.

Use isolated synthetic data and delete it during teardown. Do not run destructive tests
against production records.

## Phase 2 — Product completeness

- Add an optional reminder flow only after an email provider, sender identity, delivery
  monitoring, unsubscribe handling, and localized templates are ready.
- Let organizers set or extend an expiry date within policy limits.
- Add a clear “link expired” recovery path without exposing assignments.
- Add export/share options that never put access tokens in analytics or referrer headers.
- Consider accounts only if link-based ownership becomes a proven support problem; do not
  add authentication complexity pre-emptively.

## Phase 3 — Affiliate validation

The affiliate feature should make adding a useful gift easier. It must not turn a personal
wishlist into an advertising feed or silently alter user-entered content.

### Recommended launch sequence

1. **Apply and validate first.** Register the production domains with the bol Affiliate
   Program and Amazon Associates for every target marketplace. Keep all credentials
   server-side.
2. **Start with a narrow gift search.** Add an optional “Find a gift” or “Add from a shop”
   action next to the existing manual wish fields. Manual entry remains the primary path.
3. **Launch bol for Dutch first.** The bol Marketing Catalog API is intended for affiliate
   partners and can return product, offer, image, and rating data. Bol's current API terms
   restrict catalog-content use to the Dutch and Flemish market and require clear source
   attribution, current prices/availability, and immediate content removal when access
   ends. Do not show bol catalog content in the English interface unless the agreement is
   changed in writing.
4. **Use Amazon links before Amazon catalog search.** Amazon's current Creators API
   requires an Associates account for the marketplace and at least 10 qualifying sales in
   the previous 30 days. Until eligible, use approved Associates link tools rather than
   scraping product pages or building against the deprecated PA-API 5.0.
5. **Add Amazon Creators API after eligibility.** Use OAuth 2.0 server-side, cache the
   one-hour access token, preserve every parameter in Amazon-provided outbound links, batch
   product lookups, and enforce provider-specific rate limits.

### Architecture

Create a provider-neutral server interface:

```ts
type CatalogProvider = "bol" | "amazon";

type CatalogItem = {
  provider: CatalogProvider;
  externalId: string;
  locale: "nl-NL" | "nl-BE" | "en-GB";
  title: string;
  imageUrl?: string;
  displayPrice?: string;
  currency?: string;
  outboundUrl: string;
  retrievedAt: string;
};
```

- Implement `search`, `getItem`, and `createOutboundLink` in separate provider adapters.
- Keep credentials, OAuth tokens, partner tags, and tracking IDs outside client bundles.
- Store user-entered title, note, price, and URL exactly as entered.
- Store provider metadata separately so it can be refreshed or removed without changing
  the user's own description.
- Never rewrite an existing manually entered URL in place. Affiliate items are added via a
  deliberate provider flow with a visible disclosure.
- Treat merchant price and availability as temporary display data, not as the wishlist's
  source of truth.
- Add a provider kill switch that removes merchant content and disables outbound tracking
  without breaking manual wishlists.

### Trust, disclosure, and measurement

- Show a concise disclosure next to commercial links and a fuller explanation in the
  privacy/affiliate page in both languages.
- Label the shop before the user clicks and make clear that checkout, delivery, returns,
  and support happen at that shop.
- Rank results by relevance and user filters, not by commission percentage.
- Measure aggregate search-to-add and outbound-click conversion without storing personal
  wishlist content or identifiers.
- Do not add advertising trackers to private list and draw pages.

### Affiliate release gates

- Program and API approval for the exact domains and marketplaces.
- Legal/terms review and localized disclosures.
- Credential rotation and provider kill-switch test.
- Price/availability freshness test and stale-data fallback.
- 429, provider outage, and expired-token behavior.
- Verified attribution using the provider's own reports.

## Official affiliate references

Checked on 2026-11-17:

- [bol Affiliate Program](https://affiliate.bol.com/nl/)
- [bol Marketing Catalog API](https://api.bol.com/marketing/docs/api-reference/catalog-api-v1.html)
- [bol affiliate and API terms](https://affiliate.bol.com/nl/algemene-voorwaarden/)
- [Amazon Creators API](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction)
- [Amazon Creators API rates](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/api-rates)
- [Amazon Creators API practices](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/best-programming-practices)
