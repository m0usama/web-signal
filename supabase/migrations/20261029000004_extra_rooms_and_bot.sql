-- =====================================================================
-- WEB//SIGNAL — extra rooms (e.g. a test account) and auto-replies.
--
--   * A person may now be in more than one private room. Every room still
--     holds exactly two people, and everything stays scoped to the room.
--   * A third avatar ('c').
--   * Owner-only helpers to add a person and link two people in a room.
--   * private.auto_replies: an account that answers one specific person
--     with a rotating set of lines (used for the J.A.R.V.I.S test account).
-- =====================================================================

alter table public.room_members drop constraint if exists room_members_user_id_key;
create index if not exists room_members_user_idx on public.room_members (user_id);

alter table public.profiles drop constraint if exists profiles_avatar_key_check;
alter table public.profiles
  add constraint profiles_avatar_key_check check (avatar_key in ('a', 'b', 'c'));

-- Replies written by the database (from inside a trigger) keep their sender
-- and are timestamped just after the message they answer. Messages sent by
-- people (trigger depth 1) are unchanged: sender = auth.uid(), time = now().
create or replace function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  nested boolean := pg_trigger_depth() > 1;
begin
  if auth.uid() is not null and not nested then
    new.sender_id := auth.uid();
  end if;
  new.created_at := case when nested then clock_timestamp() else now() end;
  new.opened_at := null;
  new.expires_at := case new.mode
    when 'normal' then null
    else now() + interval '24 hours'
  end;

  select count(*) into recent
  from public.messages
  where sender_id = new.sender_id and created_at > now() - interval '1 minute';
  if recent >= 30 then
    raise exception 'RATE_LIMIT: slow down, max 30 signals per minute';
  end if;

  perform public.check_media_path(new.room_id, new.sender_id, new.media_path);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Owner-only setup helpers (run in the SQL editor)
--   select public.add_person('jarvis@web-signal.local', 'J.A.R.V.I.S', 'c');
--   select public.link_room('spidey@web-signal.local', 'jarvis@web-signal.local');
-- ---------------------------------------------------------------------

create or replace function public.add_person(
  p_email text, p_name text, p_avatar text, p_x real default 0.5, p_y real default 0.22
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then
    raise exception 'Create the user first (Authentication > Users > Add user)';
  end if;
  insert into public.profiles (id, display_name, avatar_key, map_x, map_y)
  values (uid, p_name, p_avatar, p_x, p_y)
  on conflict (id) do update set display_name = excluded.display_name, avatar_key = excluded.avatar_key;
  insert into public.user_settings (user_id) values (uid) on conflict do nothing;
  return uid;
end;
$$;

create or replace function public.link_room(p_email_a text, p_email_b text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid_a uuid;
  uid_b uuid;
  room uuid;
begin
  select p.id into uid_a from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = lower(p_email_a);
  select p.id into uid_b from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = lower(p_email_b);
  if uid_a is null or uid_b is null then
    raise exception 'Both people need a profile first (setup_pair or add_person)';
  end if;
  if uid_a = uid_b then
    raise exception 'A room needs two different people';
  end if;
  select a.room_id into room
  from public.room_members a
  join public.room_members b on b.room_id = a.room_id
  where a.user_id = uid_a and b.user_id = uid_b;
  if room is not null then
    return room;
  end if;
  insert into public.private_rooms default values returning id into room;
  insert into public.room_members (room_id, user_id) values (room, uid_a), (room, uid_b);
  return room;
end;
$$;

-- ---------------------------------------------------------------------
-- Auto-replies
-- ---------------------------------------------------------------------

create table if not exists private.auto_replies (
  bot_id            uuid not null references public.profiles (id) on delete cascade,
  reply_to          uuid not null references public.profiles (id) on delete cascade,
  lines             text[] not null check (cardinality(lines) between 1 and 20),
  cooldown_seconds  integer not null default 5 check (cooldown_seconds between 0 and 600),
  primary key (bot_id, reply_to)
);
revoke all on private.auto_replies from public, anon, authenticated;

--   select public.set_auto_reply('jarvis@web-signal.local', 'spiderziya@web-signal.local',
--     array['line one', 'line two']);
create or replace function public.set_auto_reply(p_bot_email text, p_to_email text, p_lines text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  bot uuid;
  target uuid;
begin
  select id into bot from auth.users where lower(email) = lower(p_bot_email);
  select id into target from auth.users where lower(email) = lower(p_to_email);
  if bot is null or target is null then
    raise exception 'Unknown account';
  end if;
  if p_lines is null or cardinality(p_lines) = 0 then
    delete from private.auto_replies where bot_id = bot and reply_to = target;
    return;
  end if;
  insert into private.auto_replies (bot_id, reply_to, lines)
  values (bot, target, p_lines)
  on conflict (bot_id, reply_to) do update set lines = excluded.lines;
end;
$$;

create or replace function private.auto_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r private.auto_replies;
  n integer;
begin
  if pg_trigger_depth() > 1 then
    return null; -- never answer a reply
  end if;

  select a.* into r
  from private.auto_replies a
  join public.room_members bm on bm.room_id = new.room_id and bm.user_id = a.bot_id
  where a.reply_to = new.sender_id
  limit 1;
  if not found then
    return null;
  end if;

  -- One reply per burst of messages.
  if exists (
    select 1 from public.messages
    where room_id = new.room_id and sender_id = r.bot_id
      and created_at > now() - make_interval(secs => r.cooldown_seconds)
  ) then
    return null;
  end if;

  select count(*) into n from public.messages where room_id = new.room_id and sender_id = r.bot_id;
  insert into public.messages (room_id, sender_id, client_id, kind, body, mode)
  values (new.room_id, r.bot_id, gen_random_uuid(), 'text',
          r.lines[(n % cardinality(r.lines)) + 1], 'normal');
  return null;
exception when others then
  raise notice 'auto reply skipped: %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists messages_auto_reply on public.messages;
create trigger messages_auto_reply
  after insert on public.messages
  for each row execute function private.auto_reply();

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------
revoke all on function public.add_person(text, text, text, real, real), public.link_room(text, text),
  public.set_auto_reply(text, text, text[]) from public, anon, authenticated;
revoke all on function private.auto_reply() from public, anon, authenticated;
