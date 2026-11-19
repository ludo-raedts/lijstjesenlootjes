<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project context (required)

Before making product, UI, design, content, routing, or localization changes, read:

1. `PROJECT_CONTEXT.md` for product scope and architecture.
2. `DESIGN.md` for the visual system, inclusive representation, accessibility, and seasonal rules.
3. `LOCALIZATION.md` for language boundaries and translation architecture.
4. `README.md` for setup, storage, deployment, and MVP limitations.

These documents are project requirements, not optional background.

## Language boundary

- Write source code, identifiers, types, API fields, database fields, logs, internal errors, test names, and technical documentation in English.
- Keep user-facing copy out of backend responses. APIs return stable English error codes and language-neutral data.
- Dutch is the current default interface locale, not the application’s internal language.
- New user-facing strings must be added to a translation catalog with semantic English keys. Do not add new Dutch literals directly to backend or shared domain code.
- User-created content is stored exactly as entered and is never machine-translated automatically.

## Design boundary

- Treat `DESIGN.md` as the source of truth for implementation.
- Preserve the 65/20/15 visual balance, multicultural representation rules, WCAG 2.2 AA target, and neutral/Sinterklaas/Christmas theme separation.
- Important text must remain real HTML; generated mockups are references, not production page images.

## Workflow boundary

Follow the working agreement in `PROJECT_CONTEXT.md`: branch and pull request only (never push to `main`), no secrets or production data in the repository, run the checks listed in `README.md` before opening a pull request, flag new migrations for the owner, and keep documentation in step with behavior. This file is read by both Claude Code (through `CLAUDE.md`) and Codex.
