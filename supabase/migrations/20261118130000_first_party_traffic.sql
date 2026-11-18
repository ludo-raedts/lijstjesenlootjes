-- Aggregate first-party traffic counts: one row per day, site, and public page.
-- The browser never sends a visitor identifier, URL, referrer, device, IP address, or user-created content.
create table if not exists app_private.traffic_daily (
  day date not null,
  site text not null check (site in ('nl', 'en')),
  page text not null check (page in (
    'home',
    'wishlistCreate',
    'drawCreate',
    'wheel',
    'sinterklaasDraw',
    'help',
    'privacy'
  )),
  page_view_count integer not null check (page_view_count > 0),
  visit_count integer not null check (visit_count >= 0 and visit_count <= page_view_count),
  primary key (day, site, page)
);

alter table app_private.traffic_daily enable row level security;

revoke all on table app_private.traffic_daily from public, anon, authenticated;

create or replace function public.record_traffic_measurement(
  p_site text,
  p_page text,
  p_visit boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may record traffic measurements.'
      using errcode = '42501';
  end if;

  insert into app_private.traffic_daily as traffic (
    day,
    site,
    page,
    page_view_count,
    visit_count
  )
  values (today, p_site, p_page, 1, case when p_visit then 1 else 0 end)
  on conflict (day, site, page) do update
  set
    page_view_count = traffic.page_view_count + 1,
    visit_count = traffic.visit_count + excluded.visit_count;
end;
$$;

create or replace function public.read_traffic_daily(p_days integer default 30)
returns table (
  day date,
  site text,
  page text,
  page_view_count integer,
  visit_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may read traffic measurements.'
      using errcode = '42501';
  end if;

  if p_days < 1 or p_days > 800 then
    raise exception 'The traffic measurement window is invalid.' using errcode = '22023';
  end if;

  return query
    select
      traffic.day,
      traffic.site,
      traffic.page,
      traffic.page_view_count,
      traffic.visit_count
    from app_private.traffic_daily as traffic
    where traffic.day > (now() at time zone 'Europe/Amsterdam')::date - p_days
    order by traffic.day, traffic.site, traffic.page;
end;
$$;

create or replace function public.cleanup_usage_measurement()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may clean up usage measurements.'
      using errcode = '42501';
  end if;

  delete from app_private.usage_daily
  where day < (today - interval '25 months')::date;

  delete from app_private.traffic_daily
  where day < (today - interval '25 months')::date;
end;
$$;

revoke all on function public.record_traffic_measurement(text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.read_traffic_daily(integer)
  from public, anon, authenticated;
revoke all on function public.cleanup_usage_measurement()
  from public, anon, authenticated;
grant execute on function public.record_traffic_measurement(text, text, boolean)
  to service_role;
grant execute on function public.read_traffic_daily(integer)
  to service_role;
grant execute on function public.cleanup_usage_measurement()
  to service_role;

notify pgrst, 'reload schema';
