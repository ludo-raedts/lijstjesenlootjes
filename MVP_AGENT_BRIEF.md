# MVP implementation brief — Lijstjes & Lootjes

## Objective

Build the reviewable MVP of **Lijstjes & Lootjes** as a warm, privacy-conscious web application for two related tasks:

1. create and share a wishlist;
2. create a private name draw in which every participant receives a personal link and can maintain a wishlist inside the draw.

The product should feel like people arranging a thoughtful gift together. Technology, dashboards, and account management must recede into the background.

This brief turns the approved brand and copy direction into implementation requirements. It does not replace the project sources of truth.

## Read before changing code

Read these files completely and follow them in this order:

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `DESIGN.md`
4. `LOCALIZATION.md`
5. `README.md`

This project uses Next.js 16 with breaking changes. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and heed its deprecation notices. Do not rely on remembered Next.js conventions.

When requirements conflict, security and data integrity take precedence, followed by `PROJECT_CONTEXT.md`, `DESIGN.md`, and `LOCALIZATION.md`.

## Approved positioning

The brand promise has three layers:

- **Functional:** make and share a wishlist, or draw names online with a group.
- **Emotional:** give thoughtfully.
- **Proof:** no account or app is required; access is arranged through links.

The homepage must combine the functional and emotional layers. Do not replace the approved line with “Samen wensen, loten & geven.” The word “loten” is too abstract and is not the approved product term.

## Approved Dutch homepage copy

Treat the following as product requirements, not placeholder copy.

### Header

- Wordmark: `Lijstjes & Lootjes`
- Navigation: `Verlanglijstje`, `Lootjes trekken`, `Help`
- Keep the name wheel out of the primary navigation. It may remain a secondary footer link.

### Hero

- Optional eyebrow: `Samen iets regelen`
- H1: `Maak een lijstje. Trek lootjes. Geef met aandacht.`
- Supporting text: `Maak een verlanglijstje of trek online lootjes met familie, vrienden of collega’s. Zonder account — persoonlijk geregeld via een link.`
- Primary wishlist action: `Maak een verlanglijstje`
- Draw action: `Trek lootjes`

Render the H1 as one complete localized message. CSS may wrap it visually, but do not build the sentence by concatenating translation fragments. Keep all copy as real HTML; no important text may be baked into an illustration.

### Product choices

Wishlist:

- Title: `Verlanglijstje maken`
- Body: `Zet je wensen op één plek en deel je lijst. Gasten kunnen cadeaus reserveren, zodat dubbele cadeaus worden voorkomen.`
- Action: `Maak een verlanglijstje`

Name draw:

- Title: `Lootjes trekken`
- Body: `Trek eerlijk lootjes en deel met iedereen een eigen link. De organisator ziet niet wie wie heeft getrokken.`
- Action: `Trek lootjes`

Use the descriptive actions as link text. Do not use a generic visible label such as `Open`.

### Trust line

Use:

`Jullie bepalen zelf met wie je de links deelt.`

Do not use “Alles blijft in jullie eigen groep”, “volledig privé”, or another absolute privacy promise. The application stores data, and link handling determines who can access it.

## Claim boundaries

Claims must remain scoped to the functionality that proves them:

- `Geen account nodig` may be used for both primary MVP routes.
- `Geen app nodig` may be used while all core functions work in the browser.
- Preventing duplicate gifts belongs only to the standalone wishlist with guest reservations.
- The organizer being unable to see draw assignments belongs only to the name-draw flow.
- Do not make `gratis` a central brand claim until a durable business-model decision has been made.
- Do not promise emails are sent; the MVP has no email provider.

## Visual implementation

Implement the system in `DESIGN.md`, including:

- 65% calm folk-art warmth, 20% restrained cut-paper/risograph energy, and 15% atmospheric depth;
- cream paper, forest green, brick red, powder blue, peach, and small cobalt accents;
- Fraunces for display and Atkinson Hyperlegible for interface copy when the approved self-hosted font assets are available;
- real HTML controls over or beside artwork;
- one clear primary action per page;
- neutral, year-round imagery by default;
- no generic SaaS gradients, glass cards, excessive shadows, carousels, parallax, or looping decoration.

The reference mockups communicate composition and atmosphere, not rasterized production UI. Preserve the inclusive representation rules and role rotation in `DESIGN.md`. Desktop and mobile may use different illustration crops, but must present the same content and actions.

## Product routes and behavior

Preserve these primary routes and their responsibilities:

- `/verlanglijstje-maken`: create a wishlist, issue management and guest links, edit wishes, allow atomic guest reservations, and let a guest restore their own reservation.
- `/lootjes-trekken`: enter participants and mutual exclusions, perform a cryptographically fair draw, issue personal links, and allow each participant to maintain a wishlist inside the draw.
- `/rad-draaien`: keep as a secondary, browser-local utility and do not promote it into primary navigation.

Inside a draw, each recipient has one assigned giver, so draw wishlists do not use reservation states. Do not merge the two wishlist models in the UI or domain logic.

## Security and privacy invariants

- Capability links grant access and must be treated as secrets.
- Raw personal tokens must never be persisted.
- Exchange raw fragment tokens through the existing same-origin server flow and HttpOnly/SameSite session cookies.
- The organizer must never receive a readable overview of draw assignments.
- Keep personal routes out of the sitemap and preserve `noindex`, `no-store`, and `Referrer-Policy: no-referrer` behavior where required.
- Keep optimistic concurrency around reservations so two guests cannot successfully reserve the same wish.
- APIs return stable English error codes and language-neutral data, never Dutch UI sentences or database errors.

Do not weaken these invariants to simplify the interface.

## Localization requirements

Dutch is the default interface locale, not the internal language.

- Keep source code, identifiers, types, logs, tests, API fields, database fields, and technical comments in English.
- Put all new or changed visible copy into typed translation catalogs using semantic English keys such as `home.hero.title` and `home.actions.createWishlist`.
- Keep Dutch and English catalog shapes identical.
- Do not concatenate sentence fragments at runtime.
- Allow at least 35% text expansion and avoid fixed text widths.
- Never machine-translate user-created names, titles, wishes, notes, budgets, or URLs.
- Preserve capability-token fragments and sessions when locale routing is introduced.

## SEO and sharing metadata

Use this Dutch homepage metadata at launch:

- Title: `Verlanglijstje maken en online lootjes trekken | Lijstjes & Lootjes`
- Meta description: `Maak en deel een verlanglijstje of trek online lootjes met familie, vrienden of collega’s. Zonder account of app, met persoonlijke links voor iedereen.`
- Open Graph title: `Maak een lijstje. Trek lootjes. Geef met aandacht.`

Use one clear H1 and a logical heading hierarchy. The functional routes should each target one intent:

- wishlist page: `verlanglijstje maken en delen`;
- draw page: `online lootjes trekken`.

Write for people first. Do not stuff repeated search phrases into headings or body copy.

## Accessibility and responsive requirements

Target WCAG 2.2 AA:

- visible 3 px focus treatment with sufficient contrast;
- complete keyboard operation;
- correct labels, descriptions, error associations, and heading order;
- minimum 44 × 44 px touch targets and at least 48 px height for primary buttons;
- no content or control loss at 200% zoom;
- meaningful alt text only when an illustration communicates information; otherwise use an empty alt attribute;
- no meaning conveyed by color, position, or shape alone;
- remove non-essential motion under `prefers-reduced-motion: reduce`;
- maintain readable contrast over all textures and illustrations.

On mobile, stack the two hero actions, keep the reading order logical, and crop the illustration rather than shrinking a dense desktop scene.

## Suggested delivery sequence

1. Inspect the existing routes, domain types, storage contract, and tests.
2. Establish or extend the typed localization catalogs for the touched UI.
3. Implement the design tokens, typography, and shared header/footer without changing security behavior.
4. Build the homepage hero and two product choices with the approved copy.
5. Bring the wishlist and draw flows into the same visual system while preserving their separate behavior.
6. Verify metadata, private-route indexing rules, responsive layout, accessibility, and reduced motion.
7. Run tests, type checking, and a production build.

## Acceptance criteria

The MVP is ready for review when:

- a first-time visitor can identify both primary tasks and their difference within a few seconds;
- the approved H1, supporting copy, actions, product copy, trust line, and metadata are used exactly in Dutch;
- the result visibly follows the 65/20/15 design direction and remains neutral outside December;
- wishlist reservations and private draw assignments still satisfy all security invariants;
- no new Dutch string appears in backend or shared domain code;
- desktop and mobile offer the same content quality and complete flows;
- keyboard, focus, zoom, contrast, errors, and reduced motion meet the design requirements;
- `npm test`, `npm run typecheck`, and `npm run build` pass;
- the implementation is checked against the quick review score in `DESIGN.md` and scores at least 12/14, with no zero for accessibility or representation.

## Explicit non-goals for this MVP

- no account system;
- no email delivery provider;
- no third-party analytics, analytics on personal or management pages, or advertising scripts; first-party public traffic measurement must remain cookieless, aggregate, identifier-free, and free of user-created content;
- no primary-navigation promotion for the name wheel;
- no separate Sinterklaas or Christmas product;
- no machine translation of user content;
- no readable organizer overview of draw assignments;
- no claims about production readiness until privacy retention, abuse prevention, monitoring, email behavior, and public end-to-end testing have been decided.
