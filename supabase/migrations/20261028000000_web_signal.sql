-- =====================================================================
-- WEB//SIGNAL — complete schema, security rules, storage, realtime,
-- rate limits, badges and cleanup.
--
-- Security model
--   * Exactly two people share one private room. There is no sign-up:
--     accounts are created by the owner and paired with public.setup_pair().
--   * Every table has Row Level Security. Clients only ever see rows from
--     their own room, and only while those rows have not expired.
--   * Media lives in a PRIVATE bucket. Clients may upload into their own
--     folder but can never read or sign URLs for media; the server issues
--     short-lived signed URLs only after public.open_message()/open_drop()
--     has validated access and recorded the open.
--   * Expiry is enforced by the database (policies + RPCs), never only by
--     hiding things in the browser.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 24),
  avatar_key    text not null unique check (avatar_key in ('a', 'b')),
  map_x         real not null default 0.5 check (map_x between 0 and 1),
  map_y         real not null default 0.5 check (map_y between 0 and 1),
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table public.private_rooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'WEB//SIGNAL' check (char_length(name) <= 40),
  created_at  timestamptz not null default now()
);

create table public.room_members (
  room_id       uuid not null references public.private_rooms (id) on delete cascade,
  user_id       uuid not null unique references public.profiles (id) on delete cascade,
  last_read_at  timestamptz not null default 'epoch',
  joined_at     timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.messages (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.private_rooms (id) on delete cascade,
  sender_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  client_id      uuid not null,
  kind           text not null check (kind in ('text', 'image', 'gif', 'sticker')),
  body           text check (char_length(body) <= 1000),
  sticker        text check (sticker ~ '^[a-z0-9_-]{1,32}$'),
  media_path     text check (char_length(media_path) <= 200),
  mode           text not null default 'normal' check (mode in ('normal', 'ghost', 'day')),
  ghost_seconds  integer not null default 10 check (ghost_seconds between 3 and 60),
  expires_at     timestamptz,
  opened_at      timestamptz,
  created_at     timestamptz not null default now(),
  unique (sender_id, client_id),
  check (kind <> 'text' or (body is not null and char_length(btrim(body)) > 0)),
  check (kind not in ('image', 'gif') or media_path is not null),
  check (kind in ('image', 'gif') or media_path is null),
  check (kind <> 'sticker' or sticker is not null),
  check (mode <> 'ghost' or kind in ('image', 'gif'))
);
create index messages_room_created_idx on public.messages (room_id, created_at desc);
create index messages_expires_idx on public.messages (expires_at) where expires_at is not null;
create index messages_sender_created_idx on public.messages (sender_id, created_at desc);

create table public.message_reactions (
  message_id  uuid not null references public.messages (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji       text not null check (char_length(emoji) between 1 and 16),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.pokes (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.private_rooms (id) on delete cascade,
  sender_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('heart', 'spider', 'zap', 'star', 'hug', 'web', 'fingerheart')),
  created_at  timestamptz not null default now()
);
create index pokes_room_created_idx on public.pokes (room_id, created_at desc);
create index pokes_sender_created_idx on public.pokes (sender_id, created_at desc);

create table public.signal_drops (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.private_rooms (id) on delete cascade,
  sender_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  client_id      uuid not null,
  x              real not null check (x between 0 and 1),
  y              real not null check (y between 0 and 1),
  building_id    text check (char_length(building_id) <= 32),
  body           text check (char_length(body) <= 280),
  sticker        text check (sticker ~ '^[a-z0-9_-]{1,32}$'),
  media_path     text check (char_length(media_path) <= 200),
  media_kind     text check (media_kind in ('image', 'gif')),
  mode           text not null default 'day' check (mode in ('ghost', 'day')),
  ghost_seconds  integer not null default 10 check (ghost_seconds between 3 and 60),
  expires_at     timestamptz,
  opened_at      timestamptz,
  created_at     timestamptz not null default now(),
  unique (sender_id, client_id),
  check (
    (body is not null and char_length(btrim(body)) > 0)
    or sticker is not null
    or media_path is not null
  ),
  check ((media_path is null) = (media_kind is null))
);
create index signal_drops_room_idx on public.signal_drops (room_id, created_at desc);
create index signal_drops_sender_created_idx on public.signal_drops (sender_id, created_at desc);

create table public.user_settings (
  user_id     uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  sound_on    boolean not null default true,
  volume      real not null default 0.6 check (volume between 0 and 1),
  theme       text not null default 'auto' check (theme in ('auto', 'day', 'night')),
  reduced_fx  boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table public.badges (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  badge_key  text not null,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_key)
);

-- Storage paths waiting to be deleted through the Storage API
-- (Supabase does not allow deleting storage objects with plain SQL).
create table public.media_trash (
  path       text primary key,
  queued_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

create or replace function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = auth.uid()
  );
$$;

create or replace function public.shares_room_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members me
    join public.room_members them on them.room_id = me.room_id
    where me.user_id = auth.uid() and them.user_id = p_user
  );
$$;

-- A message / drop is "live" while it has not expired.
create or replace function public.signal_is_live(
  p_mode text, p_expires_at timestamptz, p_opened_at timestamptz, p_ghost_seconds integer
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (p_expires_at is null or p_expires_at > now())
     and not (
       p_mode = 'ghost'
       and p_opened_at is not null
       and p_opened_at + make_interval(secs => p_ghost_seconds) <= now()
     );
$$;

create or replace function public.award_badge(p_user uuid, p_badge text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.badges (user_id, badge_key)
  values (p_user, p_badge)
  on conflict do nothing;
$$;

-- ---------------------------------------------------------------------
-- Guard triggers: identity, expiry, media paths, rate limits
-- ---------------------------------------------------------------------

create or replace function public.enforce_room_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.room_members where room_id = new.room_id) >= 2 then
    raise exception 'ROOM_FULL: a WEB//SIGNAL room holds exactly two people';
  end if;
  return new;
end;
$$;

create trigger room_members_size
  before insert on public.room_members
  for each row execute function public.enforce_room_size();

-- Media must be an object the sender uploaded into their own room folder.
create or replace function public.check_media_path(p_room uuid, p_sender uuid, p_path text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_path is null then
    return;
  end if;
  if p_path not like p_room::text || '/' || p_sender::text || '/%' or p_path like '%..%' then
    raise exception 'BAD_MEDIA_PATH';
  end if;
  if not exists (
    select 1 from storage.objects where bucket_id = 'signal-media' and name = p_path
  ) then
    raise exception 'MEDIA_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  -- Never trust the client for identity, timestamps or open state.
  if auth.uid() is not null then
    new.sender_id := auth.uid();
  end if;
  new.created_at := now();
  new.opened_at := null;
  new.expires_at := case new.mode
    when 'normal' then null
    else now() + interval '24 hours'   -- 24-hour signals; also the fallback for unopened ghosts
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

create trigger messages_guard
  before insert on public.messages
  for each row execute function public.messages_before_insert();

create or replace function public.drops_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  if auth.uid() is not null then
    new.sender_id := auth.uid();
  end if;
  new.created_at := now();
  new.opened_at := null;
  new.expires_at := now() + interval '24 hours';

  select count(*) into recent
  from public.signal_drops
  where sender_id = new.sender_id and created_at > now() - interval '10 minutes';
  if recent >= 10 then
    raise exception 'RATE_LIMIT: max 10 signal drops per 10 minutes';
  end if;

  perform public.check_media_path(new.room_id, new.sender_id, new.media_path);
  return new;
end;
$$;

create trigger signal_drops_guard
  before insert on public.signal_drops
  for each row execute function public.drops_before_insert();

create or replace function public.pokes_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  if auth.uid() is not null then
    new.sender_id := auth.uid();
  end if;
  new.created_at := now();

  select count(*) into recent
  from public.pokes
  where sender_id = new.sender_id and created_at > now() - interval '1 minute';
  if recent >= 20 then
    raise exception 'RATE_LIMIT: max 20 pokes per minute';
  end if;
  return new;
end;
$$;

create trigger pokes_guard
  before insert on public.pokes
  for each row execute function public.pokes_before_insert();

create or replace function public.reactions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.created_at := now();
  return new;
end;
$$;

create trigger message_reactions_guard
  before insert or update on public.message_reactions
  for each row execute function public.reactions_before_write();

-- Deleted rows hand their media to the trash queue.
create or replace function public.queue_media_for_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.media_path is not null then
    insert into public.media_trash (path) values (old.media_path) on conflict do nothing;
  end if;
  return old;
end;
$$;

create trigger messages_trash_media
  after delete on public.messages
  for each row execute function public.queue_media_for_deletion();

create trigger signal_drops_trash_media
  after delete on public.signal_drops
  for each row execute function public.queue_media_for_deletion();

-- ---------------------------------------------------------------------
-- Badges
-- ---------------------------------------------------------------------

create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_hour integer := extract(hour from (now() at time zone 'Europe/London'));
begin
  perform public.award_badge(new.sender_id, 'first_signal');
  if new.mode = 'ghost' then
    perform public.award_badge(new.sender_id, 'ghost_writer');
  end if;
  if local_hour between 0 and 4 then
    perform public.award_badge(new.sender_id, 'night_owl');
  end if;
  if (select count(*) from public.messages where sender_id = new.sender_id) >= 100 then
    perform public.award_badge(new.sender_id, 'chatterbox');
  end if;
  return new;
end;
$$;

create trigger messages_badges
  after insert on public.messages
  for each row execute function public.messages_after_insert();

create or replace function public.pokes_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  partner uuid;
begin
  perform public.award_badge(new.sender_id, 'first_poke');
  if new.kind in ('heart', 'fingerheart') then
    select p.sender_id into partner
    from public.pokes p
    where p.room_id = new.room_id
      and p.sender_id <> new.sender_id
      and p.kind in ('heart', 'fingerheart')
      and p.created_at > now() - interval '10 seconds'
    limit 1;
    if partner is not null then
      perform public.award_badge(new.sender_id, 'heart_sync');
      perform public.award_badge(partner, 'heart_sync');
    end if;
  end if;
  return new;
end;
$$;

create trigger pokes_badges
  after insert on public.pokes
  for each row execute function public.pokes_after_insert();

create or replace function public.drops_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_badge(new.sender_id, 'first_drop');
  return new;
end;
$$;

create trigger signal_drops_badges
  after insert on public.signal_drops
  for each row execute function public.drops_after_insert();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.private_rooms     enable row level security;
alter table public.room_members      enable row level security;
alter table public.messages          enable row level security;
alter table public.message_reactions enable row level security;
alter table public.pokes             enable row level security;
alter table public.signal_drops      enable row level security;
alter table public.user_settings     enable row level security;
alter table public.badges            enable row level security;
alter table public.media_trash       enable row level security;

-- Nothing is ever available without logging in.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

-- Clients get only the column privileges they need.
revoke all on public.profiles, public.private_rooms, public.room_members, public.messages,
  public.message_reactions, public.pokes, public.signal_drops, public.user_settings,
  public.badges, public.media_trash from authenticated;

grant select on public.profiles, public.private_rooms, public.room_members, public.messages,
  public.message_reactions, public.pokes, public.signal_drops, public.user_settings,
  public.badges to authenticated;
grant update (display_name, map_x, map_y) on public.profiles to authenticated;
grant insert (room_id, client_id, kind, body, sticker, media_path, mode, ghost_seconds)
  on public.messages to authenticated;
grant delete on public.messages to authenticated;
grant insert (message_id, emoji), update (emoji), delete on public.message_reactions to authenticated;
grant insert (room_id, kind) on public.pokes to authenticated;
grant insert (room_id, client_id, x, y, building_id, body, sticker, media_path, media_kind, mode, ghost_seconds)
  on public.signal_drops to authenticated;
grant delete on public.signal_drops to authenticated;
grant insert (user_id, sound_on, volume, theme, reduced_fx),
  update (sound_on, volume, theme, reduced_fx, updated_at) on public.user_settings to authenticated;

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_room_with(id));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- rooms + membership
create policy rooms_select on public.private_rooms
  for select to authenticated
  using (public.is_room_member(id));
create policy room_members_select on public.room_members
  for select to authenticated
  using (public.is_room_member(room_id));

-- messages
create policy messages_select on public.messages
  for select to authenticated
  using (
    public.is_room_member(room_id)
    and public.signal_is_live(mode, expires_at, opened_at, ghost_seconds)
  );
create policy messages_insert on public.messages
  for insert to authenticated
  with check (public.is_room_member(room_id) and sender_id = auth.uid());
create policy messages_delete_own on public.messages
  for delete to authenticated
  using (sender_id = auth.uid());

-- reactions
create policy reactions_select on public.message_reactions
  for select to authenticated
  using (exists (
    select 1 from public.messages m
    where m.id = message_id and public.is_room_member(m.room_id)
  ));
create policy reactions_insert on public.message_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and public.is_room_member(m.room_id)
        and public.signal_is_live(m.mode, m.expires_at, m.opened_at, m.ghost_seconds)
    )
  );
create policy reactions_update_own on public.message_reactions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy reactions_delete_own on public.message_reactions
  for delete to authenticated
  using (user_id = auth.uid());

-- pokes
create policy pokes_select on public.pokes
  for select to authenticated
  using (public.is_room_member(room_id) and created_at > now() - interval '7 days');
create policy pokes_insert on public.pokes
  for insert to authenticated
  with check (public.is_room_member(room_id) and sender_id = auth.uid());

-- signal drops
create policy drops_select on public.signal_drops
  for select to authenticated
  using (
    public.is_room_member(room_id)
    and public.signal_is_live(mode, expires_at, opened_at, ghost_seconds)
  );
create policy drops_insert on public.signal_drops
  for insert to authenticated
  with check (public.is_room_member(room_id) and sender_id = auth.uid());
create policy drops_delete_own on public.signal_drops
  for delete to authenticated
  using (sender_id = auth.uid());

-- settings
create policy settings_select_own on public.user_settings
  for select to authenticated using (user_id = auth.uid());
create policy settings_insert_own on public.user_settings
  for insert to authenticated with check (user_id = auth.uid());
create policy settings_update_own on public.user_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- badges (written only by triggers)
create policy badges_select on public.badges
  for select to authenticated
  using (user_id = auth.uid() or public.shares_room_with(user_id));

-- media_trash: no client policies at all.

-- ---------------------------------------------------------------------
-- RPCs called by the app
-- ---------------------------------------------------------------------

-- Opens a message. For ghost signals this records the first open and starts
-- the countdown; once the countdown ends the media can never be fetched again.
create or replace function public.open_message(p_id uuid)
returns table (
  id uuid, kind text, mode text, media_path text,
  opened_at timestamptz, expires_at timestamptz, view_until timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.messages;
begin
  select * into m from public.messages where messages.id = p_id for update;
  if not found or not public.is_room_member(m.room_id) then
    raise exception 'NOT_FOUND';
  end if;
  if not public.signal_is_live(m.mode, m.expires_at, m.opened_at, m.ghost_seconds) then
    raise exception 'EXPIRED';
  end if;

  if m.mode = 'ghost' then
    if m.sender_id = auth.uid() then
      raise exception 'GHOST_SENDER: ghost signals are for the recipient';
    end if;
    if m.opened_at is null then
      update public.messages set opened_at = now() where messages.id = p_id
      returning * into m;
    end if;
  end if;

  return query select
    m.id, m.kind, m.mode, m.media_path, m.opened_at, m.expires_at,
    case when m.mode = 'ghost'
      then m.opened_at + make_interval(secs => m.ghost_seconds)
      else m.expires_at end;
end;
$$;

create or replace function public.open_drop(p_id uuid)
returns table (
  id uuid, body text, sticker text, media_kind text, mode text, media_path text,
  opened_at timestamptz, expires_at timestamptz, view_until timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.signal_drops;
begin
  select * into d from public.signal_drops where signal_drops.id = p_id for update;
  if not found or not public.is_room_member(d.room_id) then
    raise exception 'NOT_FOUND';
  end if;
  if not public.signal_is_live(d.mode, d.expires_at, d.opened_at, d.ghost_seconds) then
    raise exception 'EXPIRED';
  end if;

  if d.sender_id <> auth.uid() and d.opened_at is null then
    update public.signal_drops set opened_at = now() where signal_drops.id = p_id
    returning * into d;
    perform public.award_badge(auth.uid(), 'finder');
  end if;

  if d.mode = 'ghost' and d.sender_id = auth.uid() then
    -- The sender can see their own text but not re-fetch ghost media.
    d.media_path := null;
  end if;

  return query select
    d.id, d.body, d.sticker, d.media_kind, d.mode, d.media_path, d.opened_at, d.expires_at,
    case when d.mode = 'ghost' and d.opened_at is not null
      then d.opened_at + make_interval(secs => d.ghost_seconds)
      else d.expires_at end;
end;
$$;

create or replace function public.mark_read(p_room uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.room_members
  set last_read_at = now()
  where room_id = p_room and user_id = auth.uid();
$$;

create or replace function public.touch_presence()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

revoke all on function public.open_message(uuid), public.open_drop(uuid), public.mark_read(uuid),
  public.touch_presence() from public, anon;
grant execute on function public.open_message(uuid), public.open_drop(uuid), public.mark_read(uuid),
  public.touch_presence(), public.is_room_member(uuid), public.shares_room_with(uuid),
  public.signal_is_live(text, timestamptz, timestamptz, integer) to authenticated;
revoke all on function public.award_badge(uuid, text), public.check_media_path(uuid, uuid, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Owner-only setup: pair the two accounts (run once in the SQL editor)
--   select public.setup_pair('her@example.com', 'NOVA', 'him@example.com', 'NIGHT');
-- The first email gets avatar A, the second avatar B.
-- ---------------------------------------------------------------------

create or replace function public.setup_pair(
  p_email_a text, p_name_a text, p_email_b text, p_name_b text
)
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
  select id into uid_a from auth.users where lower(email) = lower(p_email_a);
  select id into uid_b from auth.users where lower(email) = lower(p_email_b);
  if uid_a is null or uid_b is null then
    raise exception 'Create both users first (Authentication > Users > Add user)';
  end if;
  if uid_a = uid_b then
    raise exception 'The two emails must be different people';
  end if;
  if exists (select 1 from public.private_rooms) then
    raise exception 'A room already exists. WEB//SIGNAL is for exactly two people.';
  end if;

  insert into public.profiles (id, display_name, avatar_key, map_x, map_y)
  values (uid_a, upper(p_name_a), 'a', 0.30, 0.38),
         (uid_b, upper(p_name_b), 'b', 0.68, 0.62);

  insert into public.private_rooms default values returning id into room;
  insert into public.room_members (room_id, user_id) values (room, uid_a), (room, uid_b);
  insert into public.user_settings (user_id) values (uid_a), (uid_b);
  return room;
end;
$$;

revoke all on function public.setup_pair(text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Cleanup: removes expired rows; their media is queued in media_trash and
-- deleted from Storage by the /api/cleanup job (Storage API).
-- ---------------------------------------------------------------------

create or replace function public.cleanup_expired()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_messages integer;
  n_drops integer;
  n_pokes integer;
  n_orphans integer;
begin
  delete from public.messages m
  where not public.signal_is_live(m.mode, m.expires_at, m.opened_at, m.ghost_seconds);
  get diagnostics n_messages = row_count;

  delete from public.signal_drops d
  where not public.signal_is_live(d.mode, d.expires_at, d.opened_at, d.ghost_seconds);
  get diagnostics n_drops = row_count;

  delete from public.pokes where created_at < now() - interval '7 days';
  get diagnostics n_pokes = row_count;

  -- Uploads that were never attached to a message or drop within a day.
  insert into public.media_trash (path)
  select o.name
  from storage.objects o
  where o.bucket_id = 'signal-media'
    and o.created_at < now() - interval '1 day'
    and not exists (select 1 from public.messages m where m.media_path = o.name)
    and not exists (select 1 from public.signal_drops d where d.media_path = o.name)
  on conflict do nothing;
  get diagnostics n_orphans = row_count;

  return jsonb_build_object(
    'messages', n_messages, 'drops', n_drops, 'pokes', n_pokes, 'orphans', n_orphans
  );
end;
$$;

revoke all on function public.cleanup_expired() from public, anon, authenticated;
grant execute on function public.cleanup_expired() to service_role;

-- ---------------------------------------------------------------------
-- Storage: private bucket with size and type limits
-- Paths: <room_id>/<user_id>/<random>.<ext>
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signal-media', 'signal-media', false, 8388608,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "signal media: upload into own room folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'signal-media'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.room_members rm
      where rm.user_id = auth.uid() and rm.room_id::text = (storage.foldername(name))[1]
    )
  );

-- The uploader can see their own object for a few minutes (needed by the
-- upload call). Nobody can read media afterwards except through the server.
create policy "signal media: uploader sees fresh upload"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'signal-media'
    and owner_id = auth.uid()::text
    and created_at > now() - interval '5 minutes'
  );

-- ---------------------------------------------------------------------
-- Realtime: table changes + private room channel (presence, typing)
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.messages, public.message_reactions, public.pokes, public.signal_drops,
      public.room_members, public.profiles, public.badges;
  end if;
end;
$$;

do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute $p$
      create policy "room channel: members can listen"
        on realtime.messages for select to authenticated
        using (
          exists (
            select 1 from public.room_members rm
            where rm.user_id = auth.uid()
              and 'room:' || rm.room_id::text = realtime.topic()
          )
        )
    $p$;
    execute $p$
      create policy "room channel: members can send"
        on realtime.messages for insert to authenticated
        with check (
          exists (
            select 1 from public.room_members rm
            where rm.user_id = auth.uid()
              and 'room:' || rm.room_id::text = realtime.topic()
          )
        )
    $p$;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Scheduled cleanup inside the database every 10 minutes (pg_cron).
-- If pg_cron is not available the daily Vercel cron still cleans up.
-- ---------------------------------------------------------------------

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron not available: %', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('web-signal-cleanup', '*/10 * * * *', 'select public.cleanup_expired()');
  end if;
end;
$$;
