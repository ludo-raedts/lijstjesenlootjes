-- Lightweight connectivity probe for the application health endpoint.
-- Returns only a boolean: no application data ever leaves the database.
create or replace function public.app_health()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Only the application server may run the health check.'
      using errcode = '42501';
  end if;

  return exists (select 1 from app_private.app_state where id = true);
end;
$$;

revoke all on function public.app_health() from public, anon, authenticated;
grant execute on function public.app_health() to service_role;
