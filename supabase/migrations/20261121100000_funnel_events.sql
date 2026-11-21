-- Anonymous funnel counters for call-to-action clicks and shared-link copies.
-- No names, wishes, tokens, links, IP addresses or visitor identifiers are stored here.
-- The application validates event names against its own allowlist (src/lib/usage.ts), so the database only guards
-- the shape; a new counter then never requires a migration.
alter table app_private.usage_daily
  drop constraint if exists usage_daily_event_check;

alter table app_private.usage_daily
  add constraint usage_daily_event_check check (event ~ '^[a-z][a-z_]{0,39}$');

notify pgrst, 'reload schema';
