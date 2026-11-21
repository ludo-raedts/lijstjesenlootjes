# Search Console routine (monthly)

Search Console and Bing Webmaster Tools are set up for both domains (19 November 2026). This is the monthly routine that
turns their data into decisions. It needs about 30 minutes. Nothing here requires code access to the data: export the
tables as CSV and keep only aggregates in the repository (never personal data).

## 1. Collect (per domain property)

1. **Performance → Search results**, last 3 months, then compare with the previous period.
   - Export *Queries*, *Pages* and *Countries*.
   - Filter *Queries* on "does not contain" the brand name (`lijstjes`, `lootjes`+`lijstjes`, `wishanddraw`) to see non-brand demand.
2. **Pages → Indexing**: note *Indexed* and *Not indexed* counts and each reason. Expected: the public pages in `src/lib/paths.ts`
   are indexed; private paths (`/lootje`, `/trekking-beheren`, `/verlanglijstje/beheren`, …) show as *Excluded by noindex* or
   *Blocked by robots.txt*, which is correct.
3. **Sitemaps**: submitted vs. discovered URLs per domain.
4. **Core Web Vitals** (Search Console, once there is enough field data) next to our own counters in `/admin/usage` →
   "Speed (Core Web Vitals)". Our counters count page loads per rating (good / needs work / poor) for LCP, INP and CLS; they
   contain no values, URLs or identifiers.

## 2. Decide

| Signal | Action |
|--------|--------|
| Page has many impressions, position 8–20, CTR below 2 % | Rewrite the title and description of that page (one change at a time, note the date below). |
| Query with impressions but no page that matches it | Add an FAQ question or a section to the closest page; consider a landing page only if the intent is distinct (see `SEO_PLAN.md` §5). |
| Page indexed but zero impressions after 3 months | Check internal links to it, then its title for the target query. |
| Public page *Not indexed* | Inspect the URL; fix the reason (canonical, redirect, soft 404) before anything else. |
| Share of "poor" LCP or INP above 10 % of loads | Investigate that metric first; see "Performance notes" in `ROADMAP.md`. |
| Seasonal queries rising (Sinterklaas from October, Christmas/Secret Santa from November) | Make sure the seasonal description and OG image are active (automatic themes) and the landing page is linked from the home page. |

## 3. Log

Keep one line per month below: date, what was seen, what changed.

| Month | Seen | Changed |
|-------|------|---------|
| 2026-11 | Search Console data not yet available (properties added 19 Nov). | Seasonal descriptions, extra FAQ items, Core Web Vitals counters. |
