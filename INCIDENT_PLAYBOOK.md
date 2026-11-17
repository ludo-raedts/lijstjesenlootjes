# Incident playbook

Short, practical steps for the first hour. Keep this free of real names, links, and secrets.

## 1. Detect

- `GET /api/health` returns `200 {"status":"ok"}` when the app reaches the database and
  `503 {"status":"degraded"}` otherwise. It never returns data or error details.
- Point an uptime monitor at `https://lijstjesenlootjes.nl/api/health` and
  `https://wishanddraw.com/api/health` (check every minute, alert after 2 failures).
- Vercel alert rules (Observability → Alerts, or `vercel alerts rules ls`):
  - `ar_default` (built-in): usage and error anomalies at severity high or above, sent to
    team owners.
  - `Elevated 5xx responses` (`ar_01a1e9f9-4740-754a-80a4-ba334f372946`, custom, this project
    only): fires at high severity when at least 5% of requests in a 5-minute window return
    5xx, with at least 3 failing requests. Team owners are notified. Inspect it with
    `vercel alerts rules inspect <ruleId>`. It was accepted by Vercel but has not been
    proven by a real incident yet; verify it the first time something breaks.
  - Failed deployments are not an alert rule. Enable them under Vercel → Settings →
    Notifications (deployment failed) so a broken build is reported by email.
- Structured log events to search for in Runtime Logs: `health_check_failed`,
  `retention_cleanup_completed`, `Supabase read_app_state failed`,
  `Supabase commit_app_state failed`, `Supabase state commit conflict` (a write retried after a collision; a steady stream means the single-document store is under contention), `Supabase consume_app_rate_limit failed`,
  `Unhandled API error`. Logs never contain names, wishes, tokens, cookies, URLs, IP
  addresses, or rate-limit bucket keys.

## 2. Triage

| Symptom | Likely cause | First action |
| --- | --- | --- |
| Health `503`, all writes fail | Supabase down, wrong `SUPABASE_URL`/key, missing RPC | Check Supabase status and project; confirm migrations are applied |
| Writes fail with `rate_limited` for everyone | Rate-limit RPC missing or bucket abuse | Check `consume_app_rate_limit` exists; inspect traffic in Vercel Firewall |
| Deploy shows `Error` | Invalid env var (for example `CRON_SECRET` with non-ASCII characters) | Read the build log and fix the variable; the previous Ready deployment keeps serving |
| `/admin` login fails | Admin secrets missing or too short | Password needs 12+ characters, session secret 32+ |
| Link mails never arrive; management page shows mail `failed` | `EMAIL_PROVIDER_API_KEY` wrong or revoked, sender domain not verified | Check the Resend dashboard and the `Email send failed` log lines (status code only); fix the key or domain; organizers can mail themselves a new link from the management page |
| Recovery mails never arrive | Same as above, or the address has no recovery opt-in | Recovery answers 202 either way by design; check Resend logs, not the app |
| Cleanup returns 401 | `CRON_SECRET` missing, short, or not on Production | Reset it and redeploy |

## 3. Contain

- **Bad release:** Vercel → Deployments → previous Ready deployment → Instant Rollback.
- **Temporary write shutdown:** there is no in-app switch. In Vercel Firewall, add a custom
  rule that denies `POST`, `PATCH`, and `DELETE` requests to `/api/*`, and remove it when
  resolved. Reading existing lists and draws keeps working.
- **Affiliate problem:** set `AMAZON_AFFILIATE_DISABLED=1` and redeploy; this removes the
  commercial links without touching user content.
- **Abuse from one source:** block it with a Vercel Firewall rule.

## 4. Rotate credentials

Do this when a secret may have leaked. Updating a Vercel variable does not revoke the old
value at its provider.

1. `SUPABASE_SECRET_KEY`: create a new secret key in Supabase (Project Settings → API
   Keys), update it in Vercel Production, redeploy, then delete the old key in Supabase.
2. `THEME_ADMIN_PASSWORD` and `THEME_ADMIN_SESSION_SECRET`: set new values and redeploy.
   Changing the session secret signs out every admin session.
3. `CRON_SECRET`: `openssl rand -hex 32 | vercel env add CRON_SECRET production`, redeploy.
   Use plain ASCII; never paste the masked dots from the dashboard.
4. `EMAIL_PROVIDER_API_KEY`: create a new send-only key in Resend, update it in Vercel Production, redeploy, then delete the old key in Resend.
5. Note: changing `SUPABASE_SECRET_KEY` also changes the HMAC key for rate-limit buckets, which simply starts fresh buckets. It also changes the key of the opt-in recovery hashes unless `RECOVERY_HASH_SECRET` is set: existing recovery hashes then stop matching and those organizers can no longer recover a lost link. Set `RECOVERY_HASH_SECRET` once, before the first rotation, and never rotate it casually.

## 5. Revoke access tokens

Personal links and sessions live inside the private application-state document. To revoke
everything for one scope, delete that wishlist or draw through the app (this removes its
tokens and sessions). For a wide revocation, set `revokedAt` on tokens or clear `sessions`
in `app_private.app_state` through a reviewed SQL change, and tell affected users that they
need a new link. Never paste raw tokens into tickets or chat.

## 6. After the incident

- Write down the timeline, cause, and fix without personal data.
- Check that alerts fired. Add or tune an alert if they did not.
- Update this playbook with anything that was missing.
