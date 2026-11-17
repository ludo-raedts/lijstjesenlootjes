# Localization architecture

## Goal

The same backend and domain model must support multiple complete interfaces. A Dutch, English, German, or other interface may differ in copy and formatting, but it must not require different API routes, database fields, status values, or business logic.

## Language boundary

### English-only internals

Use English for:

- file and component names;
- variables, functions, classes, types, and test descriptions;
- API routes, request fields, response fields, enum values, and error codes;
- database columns, JSON properties, stored statuses, and role names;
- logs, monitoring events, technical comments, and internal exception messages;
- technical architecture documentation.

### Localized interface

Translate:

- page titles, headings, descriptions, buttons, labels, hints, notices, and confirmations;
- metadata and Open Graph copy;
- validation and API error messages;
- share messages and generated invitation text;
- status labels shown to users;
- accessibility labels and screen-reader-only copy;
- date, number, price, and currency presentation.

### Never translate automatically

Keep user-created content unchanged:

- names;
- group and wishlist titles;
- wishes and notes;
- free-form budget text;
- URLs.

## Locale model

- Current default locale: `nl`.
- Initial supported catalog set: `nl`, `en`.
- Planned next locale: `de`.
- Use short BCP 47 language tags in routes and application state; use full regional locales such as `nl-NL` and `en-GB` only for formatting.
- Locale choice belongs to the browser/interface session, not the draw or wishlist database record.

## Routing

Locale-prefixed routes (`/nl/...`, `/en/...`) are not used. The interface language defaults to the domain (`lijstjesenlootjes.nl` is Dutch, `wishanddraw.com` is English); an explicit choice by the visitor (cookie `ll_locale`) overrides the language of the text. Paths follow the domain, never the cookie, and every path lives in `src/lib/paths.ts` (see "Localized URL paths" below). Personal capability routes keep the token in the URL fragment, so switching domain or language never exposes it to a server. Do not encode locale in `/api` paths.

## Translation catalogs

Target structure:

```text
src/i18n/
  config.ts
  api-errors.ts
  messages/
    nl.ts
    en.ts
```

Use semantic English keys based on meaning, not the current Dutch sentence:

```ts
home.hero.title
wishlist.create.submit
draw.participant.reveal
errors.session.expired
```

Rules:

- No sentence fragments that are concatenated at runtime.
- Use parameters for names, counts, and dates.
- Keep plural variants in the catalog.
- Keep rich text structure explicit; do not inject raw translated HTML.
- Translation keys are stable API-like identifiers and should not be renamed casually.
- Dutch and English catalogs must have identical key shapes and pass a type check.

## Backend errors

Backend responses are language-neutral:

```json
{
  "error": {
    "code": "session_expired",
    "params": {}
  }
}
```

The browser maps the code and parameters to the active locale. Unknown codes use `internal_error`. Never expose database messages, stack traces, or translated server sentences.

## Formatting

- Use `Intl.DateTimeFormat` with the active formatting locale.
- Use `Intl.NumberFormat` for numbers and currencies.
- Do not store a formatted date or currency value when a typed value is available.
- Do not parse localized numbers in the backend without an explicit normalized request format.
- Keep ISO dates (`YYYY-MM-DD`) and timestamps in API/storage contracts.

## Layout resilience

German and English strings may be longer than Dutch. Components must support at least 35% text expansion:

- avoid fixed-width buttons and labels;
- allow headings and navigation items to wrap where appropriate;
- do not bake text into illustrations;
- test at 200% zoom and narrow mobile widths;
- use logical CSS properties so right-to-left support remains possible later.

## Content and visual localization

The multicultural core illustration remains shared across locales. Seasonal and market-specific imagery may vary, but must follow the representation and stereotyping rules in `DESIGN.md`.

Do not assume:

- every group celebrates the same holiday;
- family structure is nuclear or heterosexual;
- names have a Western first-name/last-name structure;
- a specific currency, date order, or gift budget convention.

## Migration plan

### Current implementation

- `AGENTS.md` requires contributors to read this document and keep internal language English.
- Backend validation and route failures return stable error codes with optional language-neutral parameters.
- Dutch and English browser translations exist for every current API error code.
- Participant-link statuses are stored and returned as `viewed` or `available`, then translated in the client.
- Date formatting reads the active HTML language instead of hardcoding `nl-NL` in interactive components.
- All UI copy lives in the typed catalogs `messages/nl.ts` and `messages/en.ts`; a test enforces identical keys and placeholders.
- Paths are per domain (`src/lib/paths.ts`) with 308 redirects for the other language's and for renamed paths.

### Phase 1 — language-neutral backend (done)

- Replace translated backend errors with stable codes.
- Replace translated status values with English enums.
- Keep API and storage field names English.
- Translate error codes in the current Dutch client.

### Phase 2 — typed UI catalogs (done)

- Move all Dutch literals from pages and components to `messages/nl.ts`.
- Create `messages/en.ts` with the same typed shape.
- Add locale-aware metadata, sharing text, dates, and accessibility labels.

### Phase 3 — domain routing (done)

- Domain-based defaults, per-domain paths, redirects, canonical and `hreflang` metadata, and a language switcher that links to the same page on the other domain.

### Phase 4 — translation quality (partly done)

- Missing-key and catalog-shape tests exist.
- Add a pseudo-locale for expansion testing.
- Review Dutch and English in context on desktop and mobile.
- Add German only after the underlying flows are stable.

## Definition of done for new work

New functionality is localization-ready when:

- internal names and values are English;
- the backend returns no user-facing translated sentence;
- visible strings have semantic catalog keys;
- dates and numbers use the active locale;
- UI supports 35% text expansion;
- user-created content remains untouched;
- Dutch and English catalog shapes match.

## Localized URL paths (Phase 3, slugs)

Paths per domain live in `src/lib/paths.ts`. Internal route folders stay Dutch; `wishanddraw.com` serves English paths via host-conditioned rewrites and redirects the Dutch ones (308), and vice versa on `lijstjesenlootjes.nl`. The path follows the domain, never the `ll_locale` cookie. Locale-prefixed routing (`/en/...`) is not used.
