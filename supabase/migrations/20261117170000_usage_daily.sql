-- Aggregate, anonymous usage counters: one row per day and event type.
-- No names, wishes, tokens, links or identifiers are ever stored here.
create table if not exists app_private.usage_daily (
  day date not null,
  event text not null check (event in (
    'wishlist_created',
    'draw_created',
    'reservation_made',
    'personal_link_opened',
    'admin_login'
  )),
  event_count integer not null check (event_count > 0),
  primary key (day, event)
);

alter table app_private.usage_daily enable row level security;

revoke all on table app_private.usage_daily from public, anon, authenticated;

create or replace function public.record_usage_event(p_event text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may record usage.'
      using errcode = '42501';
  end if;

  insert into app_private.usage_daily as usage (day, event, event_count)
  values (today, p_event, 1)
  on conflict (day, event) do update
  set event_count = usage.event_count + 1;

  if random() < 0.01 then
    delete from app_private.usage_daily where day < today - 400;
  end if;
end;
$$;

create or replace function public.read_usage_daily(p_days integer default 30)
returns table (day date, event text, event_count integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may read usage.'
      using errcode = '42501';
  end if;

  if p_days < 1 or p_days > 400 then
    raise exception 'The usage window is invalid.' using errcode = '22023';
  end if;

  return query
    select usage.day, usage.event, usage.event_count
    from app_private.usage_daily as usage
    where usage.day > (now() at time zone 'Europe/Amsterdam')::date - p_days
    order by usage.day, usage.event;
end;
$$;

revoke all on function public.record_usage_event(text) from public, anon, authenticated;
revoke all on function public.read_usage_daily(integer) from public, anon, authenticated;
grant execute on function public.record_usage_event(text) to service_role;
grant execute on function public.read_usage_daily(integer) to service_role;
