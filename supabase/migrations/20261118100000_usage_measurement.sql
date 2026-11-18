-- Add anonymous funnel counters and retain aggregate daily figures for year-over-year comparison.
-- No names, wishes, tokens, links, IP addresses or visitor identifiers are stored here.
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
    'admin_login'
  ));

drop function if exists public.record_usage_event(text);

create function public.record_usage_event(p_event text, p_amount integer default 1)
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

  if p_amount < 1 or p_amount > 100 then
    raise exception 'The usage amount is invalid.' using errcode = '22023';
  end if;

  insert into app_private.usage_daily as usage (day, event, event_count)
  values (today, p_event, p_amount)
  on conflict (day, event) do update
  set event_count = usage.event_count + excluded.event_count;

  if random() < 0.01 then
    delete from app_private.usage_daily
    where day < (today - interval '25 months')::date;
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

  if p_days < 1 or p_days > 800 then
    raise exception 'The usage window is invalid.' using errcode = '22023';
  end if;

  return query
    select usage.day, usage.event, usage.event_count
    from app_private.usage_daily as usage
    where usage.day > (now() at time zone 'Europe/Amsterdam')::date - p_days
    order by usage.day, usage.event;
end;
$$;

revoke all on function public.record_usage_event(text, integer) from public, anon, authenticated;
revoke all on function public.read_usage_daily(integer) from public, anon, authenticated;
grant execute on function public.record_usage_event(text, integer) to service_role;
grant execute on function public.read_usage_daily(integer) to service_role;

notify pgrst, 'reload schema';
