-- 1. Count anonymous email delivery outcomes (from the Resend webhook) next to the other usage events.
alter table app_private.usage_daily
  drop constraint if exists usage_daily_event_check;

alter table app_private.usage_daily
  add constraint usage_daily_event_check check (event in (
    'wishlist_created',
    'shared_wishlist_opened',
    'reservation_made',
    'draw_created',
    'participant_links_issued',
    'personal_link_opened',
    'admin_login',
    'email_delivered',
    'email_bounced',
    'email_complained',
    'email_delayed'
  ));

-- 2. The landing pages officeDraw, christmasDraw and birthdayWishlist were measured by the app but rejected by the
-- fixed page list (error 23514). The application validates page keys against its own path table, so the database
-- only needs to guard the shape; a new public page then never requires a migration.
alter table app_private.traffic_daily
  drop constraint if exists traffic_daily_page_check;

alter table app_private.traffic_daily
  add constraint traffic_daily_page_check check (page ~ '^[A-Za-z][A-Za-z0-9]{0,39}$');

notify pgrst, 'reload schema';
