create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;

create table if not exists app_private.app_state (
  id boolean primary key default true check (id),
  version bigint not null default 1 check (version > 0),
  data jsonb not null check (
    jsonb_typeof(data) = 'object'
    and data ->> 'version' = '1'
  ),
  updated_at timestamptz not null default now()
);

alter table app_private.app_state enable row level security;

insert into app_private.app_state (id, version, data)
values (
  true,
  1,
  '{"version":1,"wishlists":[],"draws":[],"accessTokens":[],"sessions":[]}'::jsonb
)
on conflict (id) do nothing;

create or replace function public.read_app_state()
returns table (version bigint, data jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Alleen de server mag de applicatiestatus lezen.'
      using errcode = '42501';
  end if;

  return query
    select state.version, state.data
    from app_private.app_state as state
    where state.id = true;
end;
$$;

create or replace function public.commit_app_state(
  p_expected_version bigint,
  p_next_data jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_rows integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Alleen de server mag de applicatiestatus wijzigen.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_next_data) <> 'object' or p_next_data ->> 'version' <> '1' then
    raise exception 'Ongeldige applicatiestatus.' using errcode = '22023';
  end if;

  update app_private.app_state
  set
    version = version + 1,
    data = p_next_data,
    updated_at = now()
  where id = true and version = p_expected_version;

  get diagnostics changed_rows = row_count;
  return changed_rows = 1;
end;
$$;

revoke all on function public.read_app_state() from public, anon, authenticated;
revoke all on function public.commit_app_state(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.read_app_state() to service_role;
grant execute on function public.commit_app_state(bigint, jsonb) to service_role;
