-- =====================================================================
-- WEB//SIGNAL v2: walkie-talkie voice notes, moods, meet-up countdown,
-- daily spark + streak, rooftop tic-tac-toe, push notifications.
-- Everything is additive; the v1 app keeps working on this schema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Voice notes (a new message kind, stored like photos in signal-media)
-- ---------------------------------------------------------------------
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages drop constraint if exists messages_check1;
alter table public.messages drop constraint if exists messages_check2;
alter table public.messages drop constraint if exists messages_check4;

alter table public.messages
  add constraint messages_kind_check check (kind in ('text', 'image', 'gif', 'sticker', 'voice')),
  add constraint messages_media_required check (kind not in ('image', 'gif', 'voice') or media_path is not null),
  add constraint messages_media_only_for_media check (kind in ('image', 'gif', 'voice') or media_path is null),
  add constraint messages_ghost_media_only check (mode <> 'ghost' or kind in ('image', 'gif', 'voice'));

alter table public.messages add column if not exists duration_ms integer
  check (duration_ms between 200 and 61000);
grant insert (duration_ms) on public.messages to authenticated;

update storage.buckets
set allowed_mime_types = array[
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'audio/mp4', 'audio/aac', 'audio/webm', 'audio/ogg', 'audio/mpeg'
]
where id = 'signal-media';

-- ---------------------------------------------------------------------
-- Moods (shown above each avatar) + "app is in the foreground" flag
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists mood text check (mood in (
    'happy', 'love', 'missing', 'sleepy', 'busy', 'study', 'work', 'food', 'gaming', 'sad', 'travel', 'party'
  )),
  add column if not exists mood_at timestamptz,
  add column if not exists foreground boolean not null default false;

grant update (mood) on public.profiles to authenticated;

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.mood is distinct from old.mood then
    new.mood_at := case when new.mood is null then null else now() end;
  end if;
  return new;
end;
$$;

create trigger profiles_mood_time
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- Heartbeat with foreground state (the server skips push while the app is open).
create or replace function public.touch_presence(p_foreground boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set last_seen_at = now(), foreground = p_foreground
  where id = auth.uid();
$$;
revoke all on function public.touch_presence(boolean) from public, anon;
grant execute on function public.touch_presence(boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Meet-up countdown (one per room, shown on the header display)
-- ---------------------------------------------------------------------
alter table public.private_rooms
  add column if not exists next_meet_at timestamptz,
  add column if not exists next_meet_label text check (char_length(next_meet_label) <= 40);

create or replace function public.set_countdown(p_room uuid, p_at timestamptz, p_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_room_member(p_room) then
    raise exception 'NOT_FOUND';
  end if;
  if p_at is not null and p_at < now() - interval '1 day' then
    raise exception 'COUNTDOWN_IN_PAST';
  end if;
  update public.private_rooms
  set next_meet_at = p_at,
      next_meet_label = nullif(left(btrim(coalesce(p_label, '')), 40), '')
  where id = p_room;
end;
$$;
revoke all on function public.set_countdown(uuid, timestamptz, text) from public, anon;
grant execute on function public.set_countdown(uuid, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------
-- Daily spark: one question a day; your partner's answer is revealed
-- only after you've answered too (enforced here, not in the browser).
-- ---------------------------------------------------------------------
create table public.spark_answers (
  room_id     uuid not null references public.private_rooms (id) on delete cascade,
  day         date not null,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  answer      text not null check (char_length(btrim(answer)) between 1 and 500),
  created_at  timestamptz not null default now(),
  primary key (room_id, day, user_id)
);

create or replace function public.spark_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/London')::date;
$$;

create or replace function public.spark_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Signed-in users always answer for themselves, for today.
  if auth.uid() is not null then
    new.user_id := auth.uid();
    new.day := public.spark_today();
    new.created_at := now();
  end if;
  return new;
end;
$$;

create trigger spark_answers_guard
  before insert on public.spark_answers
  for each row execute function public.spark_before_insert();

-- Has the caller answered the spark for this day? (definer: avoids RLS recursion)
create or replace function public.has_answered_spark(p_room uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.spark_answers
    where room_id = p_room and day = p_day and user_id = auth.uid()
  );
$$;
revoke all on function public.has_answered_spark(uuid, date) from public, anon;
grant execute on function public.has_answered_spark(uuid, date) to authenticated;

alter table public.spark_answers enable row level security;
revoke all on public.spark_answers from anon, authenticated;
grant select on public.spark_answers to authenticated;
grant insert (room_id, answer) on public.spark_answers to authenticated;

create policy spark_select on public.spark_answers
  for select to authenticated
  using (
    public.is_room_member(room_id)
    and (user_id = auth.uid() or public.has_answered_spark(room_id, day))
  );
create policy spark_insert on public.spark_answers
  for insert to authenticated
  with check (public.is_room_member(room_id) and user_id = auth.uid());

-- Days in a row on which BOTH people answered (ending today or yesterday).
create or replace function public.spark_streak(p_room uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d date := public.spark_today();
  streak integer := 0;
begin
  if not public.is_room_member(p_room) then
    return 0;
  end if;
  -- Today doesn't break the streak until it's over.
  if (select count(*) from public.spark_answers where room_id = p_room and day = d) < 2 then
    d := d - 1;
  end if;
  while (select count(*) from public.spark_answers where room_id = p_room and day = d) >= 2 loop
    streak := streak + 1;
    d := d - 1;
  end loop;
  return streak;
end;
$$;
revoke all on function public.spark_streak(uuid) from public, anon;
grant execute on function public.spark_streak(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Rooftop tic-tac-toe (moves validated by the database)
-- ---------------------------------------------------------------------
create table public.games (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.private_rooms (id) on delete cascade,
  kind        text not null default 'ttt' check (kind = 'ttt'),
  board       text not null default '.........' check (board ~ '^[.XO]{9}$'),
  x_player    uuid not null references public.profiles (id) on delete cascade,
  o_player    uuid not null references public.profiles (id) on delete cascade,
  turn        uuid references public.profiles (id) on delete cascade,
  winner      text check (winner in ('X', 'O', 'draw', 'void')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index games_room_idx on public.games (room_id, created_at desc);

alter table public.games enable row level security;
revoke all on public.games from anon, authenticated;
grant select on public.games to authenticated;
create policy games_select on public.games
  for select to authenticated
  using (public.is_room_member(room_id));

create or replace function public.ttt_new(p_room uuid)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  partner uuid;
  g public.games;
begin
  if not public.is_room_member(p_room) then
    raise exception 'NOT_FOUND';
  end if;
  select user_id into partner from public.room_members where room_id = p_room and user_id <> auth.uid();
  if partner is null then
    raise exception 'NO_PARTNER';
  end if;
  update public.games set winner = 'void', updated_at = now()
  where room_id = p_room and winner is null;
  insert into public.games (room_id, x_player, o_player, turn)
  values (p_room, auth.uid(), partner, auth.uid())
  returning * into g;
  -- keep the last 20 games
  delete from public.games
  where room_id = p_room and id not in (
    select id from public.games where room_id = p_room order by created_at desc limit 20
  );
  return g;
end;
$$;

create or replace function public.ttt_winner(b text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  lines int[][] := array[[1,2,3],[4,5,6],[7,8,9],[1,4,7],[2,5,8],[3,6,9],[1,5,9],[3,5,7]];
  l int[];
  c text;
begin
  foreach l slice 1 in array lines loop
    c := substr(b, l[1], 1);
    if c <> '.' and c = substr(b, l[2], 1) and c = substr(b, l[3], 1) then
      return c;
    end if;
  end loop;
  if position('.' in b) = 0 then
    return 'draw';
  end if;
  return null;
end;
$$;

create or replace function public.ttt_move(p_game uuid, p_cell integer)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
  mark text;
begin
  select * into g from public.games where id = p_game for update;
  if not found or not public.is_room_member(g.room_id) then
    raise exception 'NOT_FOUND';
  end if;
  if g.winner is not null then
    raise exception 'GAME_OVER';
  end if;
  if g.turn is distinct from auth.uid() then
    raise exception 'NOT_YOUR_TURN';
  end if;
  if p_cell < 0 or p_cell > 8 or substr(g.board, p_cell + 1, 1) <> '.' then
    raise exception 'BAD_MOVE';
  end if;
  mark := case when auth.uid() = g.x_player then 'X' else 'O' end;
  g.board := overlay(g.board placing mark from p_cell + 1 for 1);
  g.winner := public.ttt_winner(g.board);
  g.turn := case when g.winner is not null then null
                 when auth.uid() = g.x_player then g.o_player else g.x_player end;
  update public.games
  set board = g.board, winner = g.winner, turn = g.turn, updated_at = now()
  where id = p_game
  returning * into g;
  if g.winner in ('X', 'O') then
    perform public.award_badge(case when g.winner = 'X' then g.x_player else g.o_player end, 'rooftop_champ');
  end if;
  perform private.notify_push(jsonb_build_object(
    'type', 'games', 'id', g.id, 'room_id', g.room_id, 'from', auth.uid(), 'winner', g.winner
  ));
  return g;
end;
$$;

-- ---------------------------------------------------------------------
-- Push notifications
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique check (char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  user_agent  text check (char_length(user_agent) <= 300),
  created_at  timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
create policy push_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy push_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'NOT_FOUND';
  end if;
  if p_endpoint !~ '^https://' then
    raise exception 'BAD_ENDPOINT';
  end if;
  -- A device belongs to whoever subscribed on it most recently.
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_ua, 300));
  -- at most 5 devices per person
  delete from public.push_subscriptions
  where user_id = auth.uid() and id not in (
    select id from public.push_subscriptions where user_id = auth.uid() order by created_at desc limit 5
  );
end;
$$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- Server-side settings (push endpoint + shared secret). Not exposed by the API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.config (
  key    text primary key,
  value  text not null
);
revoke all on private.config from public, anon, authenticated;

do $$
begin
  begin
    create extension if not exists pg_net;
  exception when others then
    raise notice 'pg_net not available: %', sqlerrm;
  end;
end;
$$;

-- Asks the app server to send a push. Never blocks or fails the insert.
create or replace function private.notify_push(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text;
  secret text;
begin
  select value into url from private.config where key = 'push_url';
  select value into secret from private.config where key = 'push_secret';
  if url is null or secret is null or to_regnamespace('net') is null then
    return;
  end if;
  perform net.http_post(
    url := url,
    body := p,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    timeout_milliseconds := 5000
  );
exception when others then
  raise notice 'push skipped: %', sqlerrm;
end;
$$;
revoke all on function private.notify_push(jsonb) from public, anon, authenticated;

create or replace function public.push_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb := to_jsonb(new);
begin
  perform private.notify_push(jsonb_build_object(
    'type', tg_table_name,
    'id', r ->> 'id',
    'room_id', r ->> 'room_id',
    'from', coalesce(r ->> 'sender_id', r ->> 'user_id'),
    'kind', r ->> 'kind',
    'mode', r ->> 'mode'
  ));
  return new;
end;
$$;

create trigger messages_push after insert on public.messages
  for each row execute function public.push_after_insert();
create trigger pokes_push after insert on public.pokes
  for each row execute function public.push_after_insert();
create trigger signal_drops_push after insert on public.signal_drops
  for each row execute function public.push_after_insert();
create trigger spark_answers_push after insert on public.spark_answers
  for each row execute function public.push_after_insert();

-- ---------------------------------------------------------------------
-- Permissions for new objects
-- ---------------------------------------------------------------------
revoke execute on function
  public.profiles_before_update(), public.spark_before_insert(), public.push_after_insert()
from public, anon, authenticated;
revoke all on function public.ttt_new(uuid), public.ttt_move(uuid, integer) from public, anon;
grant execute on function public.ttt_new(uuid), public.ttt_move(uuid, integer) to authenticated;
grant execute on function public.spark_today(), public.ttt_winner(text) to authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------
-- Realtime for the new things
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.spark_answers, public.games, public.private_rooms;
  end if;
end;
$$;
