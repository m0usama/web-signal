-- =====================================================================
-- WEB//SIGNAL City Quests: games and activities at landmarks on the map.
--   * games table now holds: ttt, web4 (four in a row), memory (pairs),
--     hotcold (hide & seek on the map), word (secret word guess).
--     Every move is checked here; hidden things live in private.game_secrets.
--   * daily_answers: daily trivia + This or That (partner's answers unlock
--     once you've answered, like the spark).
--   * race_runs: Web-Swing Race times.
--   * hero_points: points from every activity (weekly scoreboard).
--   * a daily "trivia is out" notification.
-- None of this is available in chat-only rooms (guard_chat_only).
-- =====================================================================

-- ---------------------------------------------------------------- games
alter table public.games drop constraint if exists games_kind_check;
alter table public.games drop constraint if exists games_board_check;
alter table public.games
  add constraint games_kind_check check (kind in ('ttt', 'web4', 'memory', 'hotcold', 'word')),
  add constraint games_board_check check (char_length(board) <= 64);
alter table public.games add column if not exists state jsonb not null default '{}'::jsonb;
create index if not exists games_room_kind_idx on public.games (room_id, kind, created_at desc);

create table if not exists private.game_secrets (
  game_id  uuid primary key references public.games (id) on delete cascade,
  secret   jsonb not null
);
revoke all on private.game_secrets from public, anon, authenticated;

create table if not exists public.hero_points (
  id          bigint generated always as identity primary key,
  room_id     uuid not null references public.private_rooms (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  points      integer not null check (points between -10 and 50),
  reason      text not null check (char_length(reason) <= 60),
  created_at  timestamptz not null default now()
);
create index if not exists hero_points_room_idx on public.hero_points (room_id, created_at desc);
alter table public.hero_points enable row level security;
revoke all on public.hero_points from anon, authenticated;
grant select on public.hero_points to authenticated;
create policy hero_points_select on public.hero_points for select to authenticated using (public.is_room_member(room_id));

create or replace function private.add_points(p_room uuid, p_user uuid, p_points integer, p_reason text)
returns void language sql security definer set search_path = '' as $$
  insert into public.hero_points (room_id, user_id, points, reason) values (p_room, p_user, p_points, p_reason);
$$;

create or replace function private.room_partner(p_room uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select user_id from public.room_members where room_id = p_room and user_id <> auth.uid() limit 1;
$$;

-- Starts a game of `p_kind`, ending any unfinished game of the same kind.
create or replace function private.start_game(p_room uuid, p_kind text, p_board text, p_x uuid, p_o uuid, p_turn uuid, p_state jsonb)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
begin
  if not public.is_room_member(p_room) then raise exception 'NOT_FOUND'; end if;
  if p_x is null or p_o is null then raise exception 'NO_PARTNER'; end if;
  update public.games set winner = 'void', updated_at = now()
  where room_id = p_room and kind = p_kind and winner is null;
  insert into public.games (room_id, kind, board, x_player, o_player, turn, state)
  values (p_room, p_kind, p_board, p_x, p_o, p_turn, coalesce(p_state, '{}'::jsonb))
  returning * into g;
  delete from public.games
  where room_id = p_room and kind = p_kind and id not in (
    select id from public.games where room_id = p_room and kind = p_kind order by created_at desc limit 10
  );
  perform private.notify_push(jsonb_build_object('type', 'games', 'id', g.id, 'room_id', g.room_id, 'from', auth.uid(), 'kind', p_kind, 'winner', 'new'));
  return g;
end;
$$;

-- Loads a live game for the caller (locks it).
create or replace function private.my_game(p_game uuid, p_kind text)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
begin
  select * into g from public.games where id = p_game and kind = p_kind for update;
  if not found or not public.is_room_member(g.room_id) then raise exception 'NOT_FOUND'; end if;
  if g.winner is not null then raise exception 'GAME_OVER'; end if;
  if g.turn is distinct from auth.uid() then raise exception 'NOT_YOUR_TURN'; end if;
  return g;
end;
$$;

-- Saves a move, awards points when the game ends, notifies the other phone.
create or replace function private.save_game(g public.games)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  out public.games;
begin
  update public.games
  set board = g.board, winner = g.winner, turn = g.turn, state = g.state, updated_at = now()
  where id = g.id
  returning * into out;
  if out.winner in ('X', 'O') then
    perform private.add_points(out.room_id, case when out.winner = 'X' then out.x_player else out.o_player end, 3, out.kind || ' win');
    perform public.award_badge(case when out.winner = 'X' then out.x_player else out.o_player end, 'rooftop_champ');
  elsif out.winner = 'draw' then
    perform private.add_points(out.room_id, out.x_player, 1, out.kind || ' draw');
    perform private.add_points(out.room_id, out.o_player, 1, out.kind || ' draw');
  end if;
  -- Only ping the other phone when it's their turn or the game is over.
  if out.winner is not null or out.turn is distinct from auth.uid() then
    perform private.notify_push(jsonb_build_object('type', 'games', 'id', out.id, 'room_id', out.room_id, 'from', auth.uid(), 'kind', out.kind, 'winner', out.winner));
  end if;
  return out;
end;
$$;

-- Tic-tac-toe keeps its own functions; only end unfinished tic-tac-toe games.
create or replace function public.ttt_new(p_room uuid)
returns public.games language plpgsql security definer set search_path = '' as $$
begin
  return private.start_game(p_room, 'ttt', '.........', auth.uid(), private.room_partner(p_room), auth.uid(), '{}'::jsonb);
end;
$$;

create or replace function public.ttt_move(p_game uuid, p_cell integer)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
  mark text;
begin
  g := private.my_game(p_game, 'ttt');
  if p_cell is null or p_cell < 0 or p_cell > 8 or substr(g.board, p_cell + 1, 1) <> '.' then raise exception 'BAD_MOVE'; end if;
  mark := case when auth.uid() = g.x_player then 'X' else 'O' end;
  g.board := overlay(g.board placing mark from p_cell + 1 for 1);
  g.winner := public.ttt_winner(g.board);
  g.turn := case when g.winner is not null then null when auth.uid() = g.x_player then g.o_player else g.x_player end;
  return private.save_game(g);
end;
$$;

-- ---------------------------------------------------------------- Web Four (7 columns x 6 rows, row 0 = top)
create or replace function public.web4_winner(b text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  r int; c int; d int; ch text;
  dirs int[][] := array[[0,1],[1,0],[1,1],[1,-1]];
  k int;
  ok boolean;
begin
  for r in 0..5 loop
    for c in 0..6 loop
      ch := substr(b, r * 7 + c + 1, 1);
      continue when ch = '.';
      for d in 1..4 loop
        ok := true;
        for k in 1..3 loop
          if r + dirs[d][1] * k not between 0 and 5 or c + dirs[d][2] * k not between 0 and 6
             or substr(b, (r + dirs[d][1] * k) * 7 + (c + dirs[d][2] * k) + 1, 1) <> ch then
            ok := false;
            exit;
          end if;
        end loop;
        if ok then return ch; end if;
      end loop;
    end loop;
  end loop;
  if position('.' in b) = 0 then return 'draw'; end if;
  return null;
end;
$$;

create or replace function public.web4_new(p_room uuid)
returns public.games language plpgsql security definer set search_path = '' as $$
begin
  return private.start_game(p_room, 'web4', repeat('.', 42), auth.uid(), private.room_partner(p_room), auth.uid(), '{}'::jsonb);
end;
$$;

create or replace function public.web4_move(p_game uuid, p_col integer)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
  r int;
  mark text;
begin
  g := private.my_game(p_game, 'web4');
  if p_col is null or p_col < 0 or p_col > 6 then raise exception 'BAD_MOVE'; end if;
  mark := case when auth.uid() = g.x_player then 'X' else 'O' end;
  for r in reverse 5..0 loop
    if substr(g.board, r * 7 + p_col + 1, 1) = '.' then
      g.board := overlay(g.board placing mark from r * 7 + p_col + 1 for 1);
      g.state := jsonb_build_object('last', r * 7 + p_col);
      g.winner := public.web4_winner(g.board);
      g.turn := case when g.winner is not null then null when auth.uid() = g.x_player then g.o_player else g.x_player end;
      return private.save_game(g);
    end if;
  end loop;
  raise exception 'BAD_MOVE';
end;
$$;

-- ---------------------------------------------------------------- Pigeon HQ memory (16 tiles, 8 pairs)
create or replace function public.memory_new(p_room uuid)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
  layout text;
  partner uuid := private.room_partner(p_room);
begin
  select string_agg(ch, '' order by random()) into layout
  from (select unnest(string_to_array('aabbccddeeffgghh', null)) as ch) t;
  g := private.start_game(p_room, 'memory', repeat('.', 16), auth.uid(), partner, auth.uid(),
    jsonb_build_object('scores', jsonb_build_object(auth.uid()::text, 0, coalesce(partner::text, '?'), 0)));
  insert into private.game_secrets (game_id, secret) values (g.id, jsonb_build_object('layout', layout));
  return g;
end;
$$;

create or replace function public.memory_flip(p_game uuid, p_tile integer)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
  layout text;
  first int;
  a text; b text;
  me text := auth.uid()::text;
  sx int; so int;
begin
  g := private.my_game(p_game, 'memory');
  if p_tile is null or p_tile < 0 or p_tile > 15 or substr(g.board, p_tile + 1, 1) <> '.' then raise exception 'BAD_MOVE'; end if;
  select secret ->> 'layout' into layout from private.game_secrets where game_id = g.id;
  first := (g.state ->> 'pending')::int;
  if first is null then
    g.state := (g.state - 'miss') || jsonb_build_object('pending', p_tile, 'peek', jsonb_build_object('t', p_tile, 'v', substr(layout, p_tile + 1, 1)));
    return private.save_game(g);
  end if;
  if first = p_tile then raise exception 'BAD_MOVE'; end if;
  a := substr(layout, first + 1, 1);
  b := substr(layout, p_tile + 1, 1);
  g.state := g.state - 'pending' - 'peek';
  if a = b then
    g.board := overlay(overlay(g.board placing a from first + 1 for 1) placing b from p_tile + 1 for 1);
    g.state := jsonb_set(g.state, array['scores', me], to_jsonb(coalesce((g.state -> 'scores' ->> me)::int, 0) + 1));
    g.state := g.state || jsonb_build_object('hit', jsonb_build_array(first, p_tile));
  else
    g.state := g.state - 'hit' || jsonb_build_object('miss', jsonb_build_object('a', first, 'b', p_tile, 'va', a, 'vb', b));
    g.turn := case when auth.uid() = g.x_player then g.o_player else g.x_player end;
  end if;
  if position('.' in g.board) = 0 then
    sx := coalesce((g.state -> 'scores' ->> g.x_player::text)::int, 0);
    so := coalesce((g.state -> 'scores' ->> g.o_player::text)::int, 0);
    g.winner := case when sx > so then 'X' when so > sx then 'O' else 'draw' end;
    g.turn := null;
  end if;
  return private.save_game(g);
end;
$$;

-- ---------------------------------------------------------------- Spider-Sense hot & cold (hide a spot on the map)
create or replace function public.hotcold_new(p_room uuid, p_x real, p_y real)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
  partner uuid := private.room_partner(p_room);
begin
  if p_x is null or p_y is null or p_x not between 0 and 1 or p_y not between 0 and 1 then raise exception 'BAD_MOVE'; end if;
  -- x_player = hider, o_player = seeker (the seeker moves).
  g := private.start_game(p_room, 'hotcold', '', auth.uid(), partner, partner, jsonb_build_object('guesses', '[]'::jsonb, 'max', 10));
  insert into private.game_secrets (game_id, secret) values (g.id, jsonb_build_object('x', p_x, 'y', p_y));
  return g;
end;
$$;

create or replace function public.hotcold_guess(p_game uuid, p_x real, p_y real)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
  s jsonb;
  d real;
  hint text;
  n int;
begin
  g := private.my_game(p_game, 'hotcold');
  if p_x is null or p_y is null or p_x not between 0 and 1 or p_y not between 0 and 1 then raise exception 'BAD_MOVE'; end if;
  select secret into s from private.game_secrets where game_id = g.id;
  -- distance in map units (800 x 1200 city)
  d := sqrt(power((p_x - (s ->> 'x')::real) * 800, 2) + power((p_y - (s ->> 'y')::real) * 1200, 2));
  hint := case when d < 45 then 'FOUND' when d < 100 then 'BURNING' when d < 180 then 'HOT' when d < 300 then 'WARM' when d < 450 then 'COOL' else 'COLD' end;
  g.state := jsonb_set(g.state, '{guesses}', (g.state -> 'guesses') || jsonb_build_array(jsonb_build_object('x', p_x, 'y', p_y, 'hint', hint)));
  n := jsonb_array_length(g.state -> 'guesses');
  if hint = 'FOUND' then
    g.winner := 'O';
  elsif n >= coalesce((g.state ->> 'max')::int, 10) then
    g.winner := 'X';
  end if;
  if g.winner is not null then
    g.turn := null;
    g.state := g.state || jsonb_build_object('spot', s);
  end if;
  return private.save_game(g);
end;
$$;

-- ---------------------------------------------------------------- Candy Crater word guess
create or replace function public.word_new(p_room uuid, p_word text)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
  w text := upper(btrim(regexp_replace(coalesce(p_word, ''), '\s+', ' ', 'g')));
  partner uuid := private.room_partner(p_room);
begin
  if w !~ '^[A-Z ]{3,16}$' or length(replace(w, ' ', '')) < 3 then raise exception 'BAD_WORD'; end if;
  -- x_player = setter, o_player = guesser
  g := private.start_game(p_room, 'word', regexp_replace(w, '[A-Z]', '_', 'g'), auth.uid(), partner, partner,
    jsonb_build_object('guessed', '', 'misses', 0, 'max', 6));
  insert into private.game_secrets (game_id, secret) values (g.id, jsonb_build_object('word', w));
  return g;
end;
$$;

create or replace function public.word_guess(p_game uuid, p_letter text)
returns public.games language plpgsql security definer set search_path = '' as $$
declare
  g public.games;
  w text;
  l text := upper(coalesce(p_letter, ''));
  i int;
  hit boolean := false;
begin
  g := private.my_game(p_game, 'word');
  if l !~ '^[A-Z]$' or position(l in g.state ->> 'guessed') > 0 then raise exception 'BAD_MOVE'; end if;
  select secret ->> 'word' into w from private.game_secrets where game_id = g.id;
  for i in 1..length(w) loop
    if substr(w, i, 1) = l then
      g.board := overlay(g.board placing l from i for 1);
      hit := true;
    end if;
  end loop;
  g.state := jsonb_set(g.state, '{guessed}', to_jsonb((g.state ->> 'guessed') || l));
  if not hit then
    g.state := jsonb_set(g.state, '{misses}', to_jsonb((g.state ->> 'misses')::int + 1));
  end if;
  if position('_' in g.board) = 0 then
    g.winner := 'O';
  elsif (g.state ->> 'misses')::int >= coalesce((g.state ->> 'max')::int, 6) then
    g.winner := 'X';
  end if;
  if g.winner is not null then
    g.turn := null;
    g.state := g.state || jsonb_build_object('word', w);
  end if;
  return private.save_game(g);
end;
$$;

-- ---------------------------------------------------------------- daily trivia + This or That
create table if not exists public.daily_answers (
  room_id     uuid not null references public.private_rooms (id) on delete cascade,
  day         date not null,
  kind        text not null check (kind in ('trivia', 'tot')),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  answers     jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) between 1 and 20),
  score       integer not null default 0 check (score between 0 and 20),
  created_at  timestamptz not null default now(),
  primary key (room_id, day, kind, user_id)
);

create or replace function public.daily_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
    new.day := public.spark_today();
    new.created_at := now();
  end if;
  if exists (select 1 from public.private_rooms where id = new.room_id and chat_only) then
    raise exception 'CHAT_ONLY: this chat is for messages only';
  end if;
  return new;
end;
$$;
drop trigger if exists daily_answers_guard on public.daily_answers;
create trigger daily_answers_guard before insert on public.daily_answers
  for each row execute function public.daily_before_insert();

create or replace function public.has_answered_daily(p_room uuid, p_day date, p_kind text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.daily_answers where room_id = p_room and day = p_day and kind = p_kind and user_id = auth.uid());
$$;

alter table public.daily_answers enable row level security;
revoke all on public.daily_answers from anon, authenticated;
grant select on public.daily_answers to authenticated;
grant insert (room_id, kind, answers, score) on public.daily_answers to authenticated;
create policy daily_select on public.daily_answers for select to authenticated
  using (public.is_room_member(room_id) and (user_id = auth.uid() or public.has_answered_daily(room_id, day, kind)));
create policy daily_insert on public.daily_answers for insert to authenticated
  with check (public.is_room_member(room_id) and user_id = auth.uid());

-- Who has played today (no answers, just "done") — readable by both, so the
-- landmark can say YOUR TURN and the other phone gets a live update.
create table if not exists public.daily_progress (
  room_id     uuid not null references public.private_rooms (id) on delete cascade,
  day         date not null,
  kind        text not null check (kind in ('trivia', 'tot')),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (room_id, day, kind, user_id)
);
alter table public.daily_progress enable row level security;
revoke all on public.daily_progress from anon, authenticated;
grant select on public.daily_progress to authenticated;
create policy daily_progress_select on public.daily_progress for select to authenticated using (public.is_room_member(room_id));

-- Points: trivia = your score; This or That = 1 point each per 2 matching picks (once both answered).
create or replace function public.daily_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  other public.daily_answers;
  matches int := 0;
  i int;
begin
  insert into public.daily_progress (room_id, day, kind, user_id) values (new.room_id, new.day, new.kind, new.user_id)
  on conflict do nothing;
  if new.kind = 'trivia' and new.score > 0 then
    perform private.add_points(new.room_id, new.user_id, least(new.score, 5), 'trivia');
  end if;
  if new.kind = 'tot' then
    select * into other from public.daily_answers
    where room_id = new.room_id and day = new.day and kind = 'tot' and user_id <> new.user_id;
    if found then
      for i in 0..least(jsonb_array_length(new.answers), jsonb_array_length(other.answers)) - 1 loop
        if new.answers -> i = other.answers -> i then matches := matches + 1; end if;
      end loop;
      if matches / 2 > 0 then
        perform private.add_points(new.room_id, new.user_id, matches / 2, 'this or that');
        perform private.add_points(new.room_id, other.user_id, matches / 2, 'this or that');
      end if;
    end if;
  end if;
  perform private.notify_push(jsonb_build_object('type', 'daily_answers', 'id', null, 'room_id', new.room_id, 'from', new.user_id, 'kind', new.kind));
  return new;
end;
$$;
drop trigger if exists daily_answers_points on public.daily_answers;
create trigger daily_answers_points after insert on public.daily_answers
  for each row execute function public.daily_after_insert();

-- ---------------------------------------------------------------- Web-Swing Race
create table if not exists public.race_runs (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.private_rooms (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  day         date not null,
  ms          integer not null check (ms between 2000 and 600000),
  created_at  timestamptz not null default now()
);
create index if not exists race_runs_room_day_idx on public.race_runs (room_id, day, ms);
alter table public.race_runs enable row level security;
revoke all on public.race_runs from anon, authenticated;
grant select on public.race_runs to authenticated;
create policy race_select on public.race_runs for select to authenticated using (public.is_room_member(room_id));

-- Saves a run; the first time today you beat the other person's best, +3 points.
create or replace function public.race_submit(p_room uuid, p_ms integer)
returns public.race_runs language plpgsql security definer set search_path = '' as $$
declare
  r public.race_runs;
  today date := public.spark_today();
  theirs int;
  recent int;
begin
  if not public.is_room_member(p_room) then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from public.private_rooms where id = p_room and chat_only) then
    raise exception 'CHAT_ONLY: this chat is for messages only';
  end if;
  select count(*) into recent from public.race_runs where user_id = auth.uid() and created_at > now() - interval '1 minute';
  if recent >= 10 then raise exception 'RATE_LIMIT: catch your breath'; end if;
  insert into public.race_runs (room_id, user_id, day, ms) values (p_room, auth.uid(), today, p_ms) returning * into r;
  select min(ms) into theirs from public.race_runs where room_id = p_room and day = today and user_id <> auth.uid();
  if theirs is not null and p_ms < theirs and not exists (
    select 1 from public.hero_points where room_id = p_room and user_id = auth.uid() and reason = 'race ' || today::text
  ) then
    perform private.add_points(p_room, auth.uid(), 3, 'race ' || today::text);
  end if;
  perform private.notify_push(jsonb_build_object('type', 'race_runs', 'id', r.id, 'room_id', p_room, 'from', auth.uid(), 'kind', 'race'));
  return r;
end;
$$;

-- ---------------------------------------------------------------- scoreboard
create or replace function public.hero_scores(p_room uuid, p_since timestamptz)
returns table (user_id uuid, points bigint) language sql stable security definer set search_path = '' as $$
  select h.user_id, sum(h.points) from public.hero_points h
  where h.room_id = p_room and h.created_at >= p_since and public.is_room_member(p_room)
  group by h.user_id;
$$;

-- ---------------------------------------------------------------- daily "trivia is out" notification (19:00 UTC)
create or replace function private.daily_trivia_push()
returns void language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in select id from public.private_rooms where not chat_only loop
    perform private.notify_push(jsonb_build_object('type', 'daily', 'id', null, 'room_id', r.id, 'from', null, 'kind', 'trivia'));
  end loop;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('web-signal-daily-trivia', '0 19 * * *', 'select private.daily_trivia_push()');
  end if;
exception when others then
  raise notice 'daily trivia schedule skipped: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------- permissions + realtime
revoke all on function private.add_points(uuid, uuid, integer, text), private.room_partner(uuid),
  private.start_game(uuid, text, text, uuid, uuid, uuid, jsonb), private.my_game(uuid, text),
  private.save_game(public.games), private.daily_trivia_push() from public, anon, authenticated;
revoke execute on function public.daily_before_insert(), public.daily_after_insert() from public, anon, authenticated;
revoke all on function public.web4_new(uuid), public.web4_move(uuid, integer), public.memory_new(uuid), public.memory_flip(uuid, integer),
  public.hotcold_new(uuid, real, real), public.hotcold_guess(uuid, real, real), public.word_new(uuid, text), public.word_guess(uuid, text),
  public.race_submit(uuid, integer), public.hero_scores(uuid, timestamptz), public.has_answered_daily(uuid, date, text),
  public.ttt_new(uuid) from public, anon;
grant execute on function public.web4_new(uuid), public.web4_move(uuid, integer), public.memory_new(uuid), public.memory_flip(uuid, integer),
  public.hotcold_new(uuid, real, real), public.hotcold_guess(uuid, real, real), public.word_new(uuid, text), public.word_guess(uuid, text),
  public.race_submit(uuid, integer), public.hero_scores(uuid, timestamptz), public.has_answered_daily(uuid, date, text),
  public.ttt_new(uuid), public.web4_winner(text) to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.daily_answers, public.daily_progress, public.race_runs, public.hero_points;
  end if;
end;
$$;
