# Project context — Lijstjes & Lootjes

This document gives contributors and coding agents the minimum durable context needed to work on the project correctly.

## Product

Lijstjes & Lootjes is a privacy-conscious web application for two closely related tasks:

1. Create and share a wishlist. Guests can reserve gifts to prevent duplicates.
2. Create a private name draw. Every participant receives a personal capability link, sees one assigned recipient, and can create a personal wishlist inside the draw. Draw wishlists do not use reservations because each recipient has one assigned giver.

The name wheel is a secondary utility and must not return to the primary navigation without an explicit product decision.

## Current product principles

- No account is required in the MVP.
- Capability links grant access and must be treated as secrets.
- Addresses are never stored in readable form. Link recovery is opt-in and keeps only a keyed hash; mail goes out once, after the response.
- The management screen never shows an overview of draw assignments. The organizer issues the personal links and could in principle open one, which the FAQ says plainly; never claim more than that.
- Raw personal tokens are not persisted.
- User-facing flows should feel warm, simple, communal, and gift-oriented rather than technical.
- The neutral interface must work year-round; Sinterklaas, Christmas, and the four seasons are appearance layers, not separate products.
- Seasonal appearance is resolved server-side from locale-aware Europe/Amsterdam calendar rules. A protected `/admin` route can persist manual theme/layout overrides and schedule changes in the private application-state document.

## Sources of truth

- `DESIGN.md`: brand, visual language, representation, components, accessibility, themes, and design acceptance criteria.
- `LOCALIZATION.md`: internal English boundary, locale architecture, translation rules, and migration plan.
- `README.md`: local setup, Vercel/Supabase setup, security architecture, and MVP limitations.
- `supabase/migrations/`: persisted storage contract.
- `src/lib/types.ts`: application domain model.

If documents disagree, security and data integrity take precedence, followed by `PROJECT_CONTEXT.md`, `DESIGN.md`, and `LOCALIZATION.md`. Update the relevant document when a deliberate product decision changes.

## Technical architecture

- Next.js 16 with React 19 and TypeScript.
- Supabase/PostgreSQL stores one private versioned application-state document.
- Server routes own validation, sessions, capability-token exchange, and mutations.
- Browser code never receives database credentials or raw stored token hashes.
- API field names and persisted domain values are English and locale-independent.
- Vercel Functions run in Frankfurt (`fra1`), next to the Supabase database. Resend reports delivery outcomes to `/api/webhooks/resend`; only anonymous daily counters are kept.
- `error.tsx` and `global-error.tsx` provide localized error fallbacks.
- The root layout publishes the resolved `data-theme` and `data-layout` attributes; theme CSS and hero assets change without changing page semantics or content order.

## Language architecture

- Internal language: English.
- Default interface locale: Dutch (`nl`).
- First planned additional interface locale: English (`en`).
- German (`de`) exists as a cookie-selectable interface language with a partial catalog and English fallback; further locales must be possible without changing backend contracts.
- APIs return stable error codes rather than translated sentences.
- Dates, numbers, currency, metadata, sharing text, validation feedback, and accessibility labels are all locale-sensitive UI concerns.
- User-created titles, names, notes, budgets, and wishes are content, not interface copy, and remain unchanged.

## Design direction

The chosen direction combines:

- 65% calm folk-art warmth and people around a shared table;
- 20% restrained cut-paper and risograph energy;
- 15% atmospheric light, depth, and natural interaction.

Representation must be intentional and non-tokenizing. Main illustration sets vary skin tone, age, gender presentation, body shape, hair texture, ability, group type, and active role. Read `DESIGN.md` before creating or commissioning visual assets.

## Delivery expectations

For implementation changes:

- preserve personal-link and reservation security invariants;
- keep the backend locale-independent;
- verify TypeScript, tests, and production build;
- check desktop and mobile layouts;
- check keyboard focus, reduced motion, contrast, and meaningful errors;
- update the relevant source-of-truth document when architecture or product behavior changes.

## Working agreement (people and coding agents)

The repository is public and `main` is protected by a ruleset. Everyone, including Claude Code and Codex, works the same way:

- Never push to `main`. Create a branch, push it, open a pull request, wait for the two CI checks (`Lint, typecheck and unit tests`, `End-to-end (Playwright, nl + en)`), then merge. Vercel deploys `main` after the merge and builds a preview per pull request.
- Never commit secrets, tokens, real links, real addresses or production data. `.env*` is ignored; only `.env.example` with empty values is tracked. Treat anything in this repository as world-readable.
- Run `npm test`, `npm run lint`, `npm run typecheck` and, for UI or flow changes, `npm run build` and `npm run test:e2e` before opening a pull request.
- A new migration in `supabase/migrations/` is not applied by merging. Say so in the pull request: the owner applies it to the production Supabase project before or together with the deploy.
- Production changes that cannot be undone by a rollback (database migrations, DNS, Resend or Vercel settings, environment variables) are made or approved by the owner. Secrets are entered by the owner, never by an agent.
- Update the relevant source-of-truth document in the same pull request as the behavior it describes.
