-- =====================================================================
-- Push notification keys live in the database (private schema), so no
-- secret has to be copied into Vercel by hand:
--   * the webhook secret is generated here,
--   * the app generates its VAPID key pair on first use and stores it here.
-- Only the service role (the app's server) can read or check them; the
-- public key is readable by signed-in users (browsers need it to subscribe).
-- Env vars (PUSH_WEBHOOK_SECRET, VAPID_*) still take priority if set.
-- =====================================================================

insert into private.config (key, value)
values ('push_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

create or replace function public.push_check_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.config where key = 'push_secret' and value = p_secret);
$$;

create or replace function public.push_vapid_keys()
returns table (public_key text, private_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select value from private.config where key = 'vapid_public'),
    (select value from private.config where key = 'vapid_private');
$$;

create or replace function public.push_save_vapid_keys(p_public text, p_private text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- First writer wins: concurrent cold starts all end up with the same pair.
  if exists (select 1 from private.config where key = 'vapid_public') then
    return;
  end if;
  insert into private.config (key, value) values ('vapid_public', p_public), ('vapid_private', p_private)
  on conflict (key) do nothing;
end;
$$;

create or replace function public.push_public_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select value from private.config where key = 'vapid_public';
$$;

revoke all on function public.push_check_secret(text), public.push_vapid_keys(),
  public.push_save_vapid_keys(text, text), public.push_public_key() from public, anon, authenticated;
grant execute on function public.push_check_secret(text), public.push_vapid_keys(),
  public.push_save_vapid_keys(text, text), public.push_public_key() to service_role;
grant execute on function public.push_public_key() to authenticated;
