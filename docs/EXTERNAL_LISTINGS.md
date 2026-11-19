# External listings and outreach log

Record of directory submissions, editorial pitches and link-building decisions for `lijstjesenlootjes.nl` and `wishanddraw.com`. It is the owner's hand-off from ChatGPT-assisted sessions on 2026-11-18 and 2026-11-19. Statuses are **as reported in those sessions and were not independently verified**; check the third-party dashboards or mailboxes before relying on them.

Rules used for every submission:

- International (`.com`) submissions and pitches use the public `info@wishanddraw.com` address; Dutch ones use `info@lijstjesenlootjes.nl`.
- No account registration, no paid placement and no mandatory reciprocal link. Anything that required one of these was skipped.
- Captchas and human-verification widgets were completed by the owner, never bypassed.
- Pitches and public comments were sent only after the owner confirmed the exact text and destination.
- Only the official logo or a current product screenshot is uploaded; no outdated or misleading imagery.

## Submitted

| Site | Domain | Status (as reported) | Notes |
|------|--------|----------------------|-------|
| SaaSHub | wishanddraw.com | Received, awaiting approval | Submitted without an account, so the listing cannot be managed or verified later. |
| The Tool Directory | wishanddraw.com | Submitted for review | |
| Launching Next | wishanddraw.com | Free queue, about four months | The paid $99 upgrade was declined. |
| Startup Buffer | wishanddraw.com | Submitted | Product screenshot required. A private management link goes to the contact address. |
| DevElif | wishanddraw.com | Live | Dofollow link: <https://develif.com/s/wish-and-draw>. |
| Rivelo Labs | wishanddraw.com | Submitted, review expected in 1–2 days | |
| BuildVoyage | wishanddraw.com | Submitted | Needed the 512×512 logo. The confirmation link in the contact mailbox still has to be clicked to complete it. |
| Startups Gallery | wishanddraw.com | Completed | |
| AlternativeTo | | In review | |
| Startpagina (several categories) | lijstjesenlootjes.nl | Mostly awaiting review | "Kerst" and "Sinterklaas" categories were rejected. |

## Editorial pitches

Sent after owner confirmation; no placement is guaranteed.

| Target | Type | Status |
|--------|------|--------|
| The News Minute (outdated Secret Santa comparison of 15 sites) | Update pitch via contact form | Sent |
| English Rose from Manchester (Secret Santa generator comparison) | Public comment on the existing post | Posted |
| WhistleOut (Secret Santa apps roundup, mobile-app oriented) | Pitch via form | Sent after the owner solved the captcha |

## Blocked or open

- **Share Your Startup** (`shareyourstartup.com/submit.html`): the "Post it" button stays disabled because the Cloudflare Turnstile callback does not complete, also after reload. The protection is not bypassed. Status: technically blocked; retry later.
- **BuildVoyage**: confirmation email still to be confirmed (see above).

## Skipped on purpose

| Site | Reason |
|------|--------|
| 10015 | Mandatory registration |
| Uneed | Needs registration to save the submission |
| Alternative.me, Peerlist, Startup Inspire | Registration required |
| The Startup Project | Requires a reciprocal link on `wishanddraw.com` |
| Christmas Junction | Requires a reciprocal link |
| ChristmasSites.net | Paid ($4.99) and weak for SEO |
| AllTopStartups | Paid ($39–$79) |
| Feedough | Accepts only AI startups |

## Findings and decisions

- Generic "link swap" directories add little. The realistic opportunities are current Christmas, gift and Secret Santa blog posts and comparison articles, approached with a personal pitch or comment.
- The market is saturated and organic response so far is low; the only response received to date was paid offers.
- **Hidden links are not an option.** Links placed where visitors cannot see them, including on the owner's other sites, are covered by Google's spam policies on hidden links and link schemes. They carry penalty risk and do not count as legitimate link building. Any link from another site must be visible, editorially relevant and natural.
- Assessing the owner's other sites (`raedts.net`, `magicmelodymakers.com`, `hockeyumpire.app`, `chatgtpprompthub.com`, `banned-books.org`) for visible, relevant links was started but **not finished**. Topical relevance to a Secret Santa and wishlist tool is low for most of them, so treat any link there as low value and consider `rel="sponsored"` or `nofollow` where the link is not editorial.

## Follow-ups

- [ ] Click the BuildVoyage confirmation link.
- [ ] Retry Share Your Startup later, or leave it out.
- [ ] Check SaaSHub, The Tool Directory, Rivelo Labs, AlternativeTo and Startpagina for approval.
- [ ] Finish the assessment of the owner's other sites and decide what, if anything, to link.
- [ ] Look for further international Christmas and gift guides that accept visible, natural mentions.
- [ ] Register Search Console and Bing Webmaster Tools ownership in the repository notes once confirmed (see `SEO_PLAN.md`, phase 0).

## Next steps researched on 2026-11-19

Web research, not verified against each site. Roundups are partly dated or self-promotional, so treat them as leads.

1. **Bing Webmaster Tools via Search Console import.** Bing can import verified Search Console sites and sitemaps without re-verifying, using the Google account that owns the property ([Bing blog](https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools)). This is still open in `SEO_PLAN.md` phase 0. IndexNow can notify Bing and reportedly Yandex, Seznam and Naver of changes; Google does not support it. It needs a key file in the repository, so it would be a small code change through a pull request; verify details with Bing first ([overview](https://x-cmd.com/seo/bing-indexnow)).
2. **Editorial pitches for `wishanddraw.com`** to current Secret Santa roundups, with one concrete difference per pitch (exclusion rules, no account needed, free): [Uplup](https://uplup.com/blog/best-secret-santa-generator-tools), [GiftList](https://giftlist.com/blog/best-secret-santa-apps-2026) (a competitor), [PopSci](https://www.popsci.com/story/diy/secret-santa-websites-guide/), [Windows Report](https://windowsreport.com/secret-santa-websites/), [Gitnux](https://gitnux.org/best/secret-santa-software/), [Streamer.guide](https://streamer.guide/guides/best-secret-santa-apps). Expect little response.
3. **Dutch market.** `lootjestrekken.nl` (DrawNames, since 2001) dominates and publishes yearly holiday-survey press releases ([2025](https://static-cdn.drawnames.com/Content/Press/20251113-NL-Persbericht-Feestdagenonderzoek.pdf)). No current Dutch comparison article was found. That is a gap for an own comparison or tips page (`SEO_PLAN.md` section 5). Sinterklaas is on 5 December, so outreach to Dutch blogs has little time.
4. **Own sites:** only visible, relevant links; low topical fit.
5. **Measure:** after a few weeks, check the Search Console Links report to see which listings actually link to the sites. Whether the directory submissions have SEO value is unknown until then.

Follow-ups:

- [ ] Import the sites into Bing Webmaster Tools and submit the sitemaps.
- [ ] Decide whether to add IndexNow (key file, pull request).
- [ ] Pitch the roundups listed above.
- [ ] Decide on a Dutch comparison or tips page.
- [ ] Review the Search Console Links report in a few weeks.
