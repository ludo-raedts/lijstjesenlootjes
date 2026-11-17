create table if not exists app_private.rate_limits (
  bucket_key text primary key check (bucket_key ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null
);

create index if not exists rate_limits_updated_at_idx
  on app_private.rate_limits (updated_at);

alter table app_private.rate_limits enable row level security;

revoke all on table app_private.rate_limits from public, anon, authenticated;

create or replace function public.consume_app_rate_limit(
  p_bucket_key text,
  p_maximum integer,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  current_time timestamptz := clock_timestamp();
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may consume rate limits.'
      using errcode = '42501';
  end if;

  if p_bucket_key !~ '^[a-f0-9]{64}$' then
    raise exception 'The rate-limit bucket key is invalid.' using errcode = '22023';
  end if;

  if p_maximum < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'The rate-limit policy is invalid.' using errcode = '22023';
  end if;

  insert into app_private.rate_limits as limits (
    bucket_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_bucket_key, current_time, 1, current_time)
  on conflict (bucket_key) do update
  set
    request_count = case
      when limits.window_started_at <= current_time - make_interval(secs => p_window_seconds)
        then 1
      else limits.request_count + 1
    end,
    window_started_at = case
      when limits.window_started_at <= current_time - make_interval(secs => p_window_seconds)
        then current_time
      else limits.window_started_at
    end,
    updated_at = current_time
  returning request_count into current_count;

  if random() < 0.01 then
    delete from app_private.rate_limits
    where updated_at < current_time - interval '7 days';
  end if;

  return current_count <= p_maximum;
end;
$$;

revoke all on function public.consume_app_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_app_rate_limit(text, integer, integer)
  to service_role;
