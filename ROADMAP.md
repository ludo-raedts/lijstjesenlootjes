# Product and delivery roadmap

Status date: 2026-11-17 (updated after the CI, recovery, mail-status and linking sprint)

This roadmap follows the product, design, localization, and deployment constraints in
`PROJECT_CONTEXT.md`, `DESIGN.md`, `LOCALIZATION.md`, and `README.md`.

## Where we are

Live on `lijstjesenlootjes.nl` and `wishanddraw.com`: wishlists with reservations, draws with exclusions and personal links, the name wheel, Dutch and English interfaces with per-domain paths, seasonal themes with a protected admin, durable rate limiting, retention cleanup, security headers with a nonce CSP, anonymous usage counters, optional one-off email, and Amazon affiliate links with disclosure.

Added in the latest sprint (not yet pushed when this was written; check `git log` for the commit):

- GitHub Actions CI (`.github/workflows/ci.yml`): typecheck, unit tests, and the full e2e suite.
- Opt-in recovery of a lost management link, without storing the address.
- Email sent after the response with retries and a visible status; the organizer can mail a fresh link.
- Clear explanation of expired, replaced, or unknown links; the organizer can move a draw's date and every link follows.
- Progress and reminder messages per participant; a participant can link an existing wishlist.
- Footer and privacy text no longer describe a closed preview.

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

**Status (2026-11-17): partly implemented.** Parked on purpose: the external parts (uptime monitor, Vercel failed-deploy notifications, a check that the daily cron ran). `GET /api/health` (database probe via the `app_health` RPC, migration `20261117160000_app_health.sql`) and `INCIDENT_PLAYBOOK.md` exist. Still manual: apply the migration, point an uptime monitor at `/api/health`, and configure Vercel alerts for 5xx and failed deploys.

- Add a minimal health endpoint that checks application-to-database connectivity without
  returning database contents.
- Create alerts for elevated 5xx responses, failed Supabase RPC calls, and failed deploys.
- Use structured English event names and stable error codes.
- Redact request bodies, names, wishes, tokens, cookies, URLs, and client identifiers.
- Write a short incident playbook covering credential rotation, token revocation, and
  temporary write shutdown.

### 3. End-to-end quality gate

**Status (2026-11-17): implemented** in `e2e/` (`npm run test:e2e`, 45 tests across the `nl` and `en` projects, against an in-memory Supabase stand-in so no real data is touched). Runs in CI on every pull request and push to `main`. Still manual: a GitHub branch-protection rule that makes the checks mandatory before merging, since Vercel deploys `main` on its own.

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

## Usage dashboard

Implemented (2026-11-17): `/admin/usage` with anonymous daily counters and a stock summary. Amazon clicks and conversions are not measured here; use Amazon Associates reports.

## Phase 2 — Product completeness

Done:

- One-off mail of the links at creation, sent after the response with retries and a visible status.
- Opt-in link recovery (keyed hash of the address, never the address) with a neutral, rate-limited recovery page.
- Organizers can mail themselves a fresh management link and move a draw's date; links follow the new expiry.
- A "link expired / replaced / unknown" experience that says what to do next, without exposing assignments.
- Progress per draw and per-participant reminder messages (no link in a reminder, because personal links cannot be retrieved).
- A participant can link a standalone wishlist; the giver sees its live wishes, never its reservations.

Also done (second sprint): an opt-in one-off reminder to the organizer (address sealed, wiped after sending), adding and removing participants with a fresh draw, a group note, co-managers for a wishlist with revocable links, a notice when a linked wishlist was deleted, landing pages for the office, Christmas and birthdays, and a German interface (cookie-selectable, partial catalog with English fallback; no German domain yet).

Still open:

- Done 2026-11-19: SPF, DKIM and DMARC are in place for both domains; the Resend webhook (`/api/webhooks/resend`) feeds delivered/bounced/complained/delayed counters in the usage dashboard. Still manual: create the webhook in Resend, set `RESEND_WEBHOOK_SECRET`, apply migration `20261119100000`, and send test mail to Gmail and Outlook.
- Reminders to participants (not only the organizer) need participant addresses and are deliberately not built.
- Export/share options that never put access tokens in analytics or referrer headers.
- Consider accounts only if link-based ownership proves to be a support problem.

## Storage migration (do before heavy traffic)

The store (`src/lib/store.ts`) keeps one versioned JSON document and commits with optimistic concurrency. Collisions now retry with full-jitter backoff (12 attempts) and are logged as `Supabase state commit conflict`, which is the signal to act on: a steady stream of them, or `The database was too busy` errors, means the single document has become the bottleneck. The document also grows with every list and draw, and every request reads all of it.

Why it was not cut over in the same sprint: it moves all production data, needs migrations applied to the live Supabase project, and cannot be validated against real data from a development machine. Do it as its own, supervised release.

Target schema (private schema, RLS on, no public policies, all access through `security definer` RPCs or the server key as today):

- `wishlists(id, title, occasion, date, created_at, updated_at, recovery_hash, email_state, email_at)`
- `wishes(id, wishlist_id, position, title, url, price, note, reserved_by_session_hash, reserved_at)`
- `draws(id, request_id unique, title, organizer_name, budget, date, created_at, recovery_hash, email_state, email_at)`
- `participants(id, draw_id, name, active_token_hash, viewed_at, linked_wishlist_id)`, `draw_wishes(id, participant_id, position, title, url, price, note)`
- `exclusions(draw_id, from_id, to_id)`, `assignments(draw_id, giver_id, recipient_id)`
- `access_tokens(hash pk, role, scope_id, participant_id, expires_at, revoked_at)`, `sessions(hash pk, access_hash, role, scope_id, participant_id, expires_at)`
- `site_settings(key pk, value jsonb)` for the theme settings

Cutover plan:

1. Add the tables in a migration; keep `app_state` untouched.
2. Write a one-off, idempotent copy from the JSON document into the tables, plus a verification query that compares counts and hashes.
3. Introduce a store interface with the current document implementation and a table implementation; route by a server-side flag. Reservation becomes one atomic `UPDATE ... WHERE reserved_by_session_hash IS NULL`.
4. Run the e2e suite against both implementations (the in-memory mock needs a table-shaped twin).
5. Freeze writes briefly (Vercel Firewall rule from the incident playbook), copy, verify, flip the flag, unfreeze; keep the JSON document for one retention period as a fallback, then drop it.

## Phase 3 — Affiliate validation

Update 2026-11-19: the Awin programme is approved and Amazon Associates is approved. Whether the Awin product feed may be shown in the product (content-use terms, freshness, attribution) and how it is connected (Awin MCP or feed import) is still to be confirmed before building; Amazon catalog search through the Creators API still needs the sales threshold below, while plain tagged links do not.

The affiliate feature should make adding a useful gift easier. It must not turn a personal
wishlist into an advertising feed or silently alter user-entered content.

The wish editor now offers searchable, curated Dutch and English gift ideas. Adding an idea
creates an editable wish without a shop URL; Dutch bol product examples are separate, explicit
choices and follow the existing domain, locale, and affiliate kill switch. Product imagery,
prices, country-specific shops, and live Awin feeds remain future work until the relevant
programme, feed access, and content-use terms have been verified.

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
- Never rewrite a manually entered URL in storage. Decision 2026-11-17: for the Amazon
  programme only, full links on the programme's own marketplace receive the Associates tag
  at display time (replacing any existing tag), with a visible disclosure and a privacy
  statement. Other hosts and short links stay untouched. The tag is public (it is in every
  outbound link) and is passed to the browser for this purpose.
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
