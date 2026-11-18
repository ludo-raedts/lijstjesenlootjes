-- Country-level traffic is kept separately from page-level traffic to avoid unnecessary combinations.
-- Vercel derives the country from the request IP; only the two-letter country code reaches this table.
create table if not exists app_private.country_traffic_daily (
  day date not null,
  site text not null check (site in ('nl', 'en')),
  country text not null check (country ~ '^[A-Z]{2}$'),
  page_view_count integer not null check (page_view_count > 0),
  visit_count integer not null check (visit_count >= 0 and visit_count <= page_view_count),
  primary key (day, site, country)
);

alter table app_private.country_traffic_daily enable row level security;

revoke all on table app_private.country_traffic_daily from public, anon, authenticated;

create or replace function public.record_traffic_measurement_with_country(
  p_site text,
  p_page text,
  p_visit boolean,
  p_country text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Amsterdam')::date;
  country_code text := upper(trim(coalesce(p_country, '')));
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may record traffic measurements.'
      using errcode = '42501';
  end if;

  if country_code !~ '^[A-Z]{2}$' then
    country_code := 'ZZ';
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

  insert into app_private.country_traffic_daily as traffic (
    day,
    site,
    country,
    page_view_count,
    visit_count
  )
  values (today, p_site, country_code, 1, case when p_visit then 1 else 0 end)
  on conflict (day, site, country) do update
  set
    page_view_count = traffic.page_view_count + 1,
    visit_count = traffic.visit_count + excluded.visit_count;
end;
$$;

create or replace function public.exclude_traffic_measurement(
  p_site text,
  p_measurements jsonb,
  p_country text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Amsterdam')::date;
  country_code text := upper(trim(coalesce(p_country, '')));
  measurement jsonb;
  page_key text;
  requested_page_views integer;
  requested_visits integer;
  current_page_views integer;
  current_visits integer;
  removed_page_views integer := 0;
  removed_visits integer := 0;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may exclude administrator traffic.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_measurements) <> 'array' or jsonb_array_length(p_measurements) < 1 then
    raise exception 'The traffic exclusion is invalid.' using errcode = '22023';
  end if;

  if country_code !~ '^[A-Z]{2}$' then
    country_code := 'ZZ';
  end if;

  for measurement in select value from jsonb_array_elements(p_measurements)
  loop
    page_key := measurement ->> 'page';
    requested_page_views := (measurement ->> 'page_views')::integer;
    requested_visits := (measurement ->> 'visits')::integer;
    if
      requested_page_views < 1 or
      requested_page_views > 100 or
      requested_visits < 0 or
      requested_visits > requested_page_views
    then
      raise exception 'The traffic exclusion is invalid.' using errcode = '22023';
    end if;

    select traffic.page_view_count, traffic.visit_count
    into current_page_views, current_visits
    from app_private.traffic_daily as traffic
    where traffic.day = today and traffic.site = p_site and traffic.page = page_key
    for update;

    if found then
      requested_page_views := least(requested_page_views, current_page_views);
      requested_visits := least(requested_visits, current_visits);
      removed_page_views := removed_page_views + requested_page_views;
      removed_visits := removed_visits + requested_visits;

      if requested_page_views = current_page_views then
        delete from app_private.traffic_daily
        where day = today and site = p_site and page = page_key;
      else
        update app_private.traffic_daily
        set
          page_view_count = current_page_views - requested_page_views,
          visit_count = least(
            greatest(0, current_visits - requested_visits),
            current_page_views - requested_page_views
          )
        where day = today and site = p_site and page = page_key;
      end if;
    end if;
  end loop;

  select traffic.page_view_count, traffic.visit_count
  into current_page_views, current_visits
  from app_private.country_traffic_daily as traffic
  where traffic.day = today and traffic.site = p_site and traffic.country = country_code
  for update;

  if found and removed_page_views > 0 then
    removed_page_views := least(removed_page_views, current_page_views);
    removed_visits := least(removed_visits, current_visits);
    if removed_page_views = current_page_views then
      delete from app_private.country_traffic_daily
      where day = today and site = p_site and country = country_code;
    else
      update app_private.country_traffic_daily
      set
        page_view_count = current_page_views - removed_page_views,
        visit_count = least(
          greatest(0, current_visits - removed_visits),
          current_page_views - removed_page_views
        )
      where day = today and site = p_site and country = country_code;
    end if;
  end if;
end;
$$;

-- Keep the deployed three-argument caller working during a rolling deployment.
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
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may record traffic measurements.'
      using errcode = '42501';
  end if;

  perform public.record_traffic_measurement_with_country(p_site, p_page, p_visit, 'ZZ');
end;
$$;

create or replace function public.read_country_traffic_daily(p_days integer default 30)
returns table (
  day date,
  site text,
  country text,
  page_view_count integer,
  visit_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may read country traffic measurements.'
      using errcode = '42501';
  end if;

  if p_days < 1 or p_days > 800 then
    raise exception 'The country traffic measurement window is invalid.' using errcode = '22023';
  end if;

  return query
    select
      traffic.day,
      traffic.site,
      traffic.country,
      traffic.page_view_count,
      traffic.visit_count
    from app_private.country_traffic_daily as traffic
    where traffic.day > (now() at time zone 'Europe/Amsterdam')::date - p_days
    order by traffic.day, traffic.site, traffic.country;
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

  delete from app_private.country_traffic_daily
  where day < (today - interval '25 months')::date;
end;
$$;

revoke all on function public.record_traffic_measurement_with_country(text, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.record_traffic_measurement(text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.exclude_traffic_measurement(text, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.read_country_traffic_daily(integer)
  from public, anon, authenticated;
revoke all on function public.cleanup_usage_measurement()
  from public, anon, authenticated;
grant execute on function public.record_traffic_measurement_with_country(text, text, boolean, text)
  to service_role;
grant execute on function public.record_traffic_measurement(text, text, boolean)
  to service_role;
grant execute on function public.exclude_traffic_measurement(text, jsonb, text)
  to service_role;
grant execute on function public.read_country_traffic_daily(integer)
  to service_role;
grant execute on function public.cleanup_usage_measurement()
  to service_role;

notify pgrst, 'reload schema';
