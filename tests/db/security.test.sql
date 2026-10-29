-- WEB//SIGNAL database security tests.
-- Runs against a local Supabase (CI) or plain Postgres + supabase-stub.sql.
-- Every check raises an exception on failure; psql runs with ON_ERROR_STOP.
\set ON_ERROR_STOP on
\set QUIET on
begin;

-- ------------------------------------------------------------------ helpers
create schema if not exists t;
grant usage on schema t to authenticated, anon, service_role;

create or replace function t.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

create or replace function t.throws(stmt text, pattern text, msg text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlerrm ~* pattern then
      raise notice 'ok - % (%)', msg, sqlerrm;
      return;
    end if;
    raise exception 'FAIL: % — wrong error: %', msg, sqlerrm;
  end;
  raise exception 'FAIL: % — no error raised', msg;
end $$;

create or replace function t.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;
grant execute on all functions in schema t to authenticated, anon, service_role;

-- ------------------------------------------------------------------ fixtures
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'nova@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'night@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'stranger@example.com');

create temp table ctx (k text primary key, v text);
grant all on ctx to authenticated, service_role;
insert into ctx values ('room', public.setup_pair('nova@example.com', 'Nova', 'NIGHT@example.com', 'Night')::text);

select t.ok((select count(*) = 2 from public.room_members), 'setup_pair creates a room with two members');
select t.ok((select avatar_key = 'a' from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'first email gets avatar A');
select t.throws($$select public.setup_pair('nova@example.com','x','stranger@example.com','y')$$,
  'already exists', 'a second room cannot be created');
select t.throws($$insert into public.room_members (room_id, user_id)
  select room_id, user_id from public.room_members limit 1$$, 'duplicate|ROOM_FULL', 'room cannot gain a third member');

-- ================================================================== anon
set local role anon;
select t.throws($$select * from public.messages$$, 'permission denied', 'anon cannot read messages');
select t.throws($$select * from public.profiles$$, 'permission denied', 'anon cannot read profiles');
select t.throws($$select public.open_message(gen_random_uuid())$$, 'permission denied', 'anon cannot call open_message');
reset role;

-- ================================================================== A sends
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated;

select t.throws($$select public.setup_pair('a','b','c','d')$$, 'permission denied', 'users cannot call setup_pair');
select t.throws($$select public.cleanup_expired()$$, 'permission denied', 'users cannot call cleanup_expired');

insert into public.messages (room_id, client_id, kind, body)
values ((select v::uuid from ctx where k = 'room'), gen_random_uuid(), 'text', 'hey you');

select t.ok((select sender_id = auth.uid() from public.messages where body = 'hey you'),
  'sender_id is forced to the logged-in user');
select t.ok((select expires_at is null from public.messages where body = 'hey you'),
  'normal messages do not expire');

select t.throws($$insert into public.messages (room_id, sender_id, client_id, kind, body)
  values ((select v::uuid from ctx where k='room'), 'bbbbbbbb-0000-0000-0000-000000000002', gen_random_uuid(), 'text', 'fake')$$,
  'permission denied', 'A cannot write a message as B');
select t.throws($$insert into public.messages (room_id, client_id, kind, body)
  values (gen_random_uuid(), gen_random_uuid(), 'text', 'elsewhere')$$,
  'row-level security|foreign key', 'A cannot post into another room');
select t.throws($$update public.messages set body = 'edited'$$, 'permission denied', 'messages cannot be edited');
select t.throws($$insert into public.messages (room_id, client_id, kind, body, opened_at)
  values ((select v::uuid from ctx where k='room'), gen_random_uuid(), 'text', 'x', now())$$,
  'permission denied', 'client cannot set opened_at');

-- 24-hour signal
insert into public.messages (room_id, client_id, kind, body, mode)
values ((select v::uuid from ctx where k = 'room'), gen_random_uuid(), 'text', 'one day only', 'day');
select t.ok((select expires_at between now() + interval '23 hours 59 minutes' and now() + interval '24 hours 1 minute'
  from public.messages where body = 'one day only'), '24-hour signal expires in 24h (server time)');

-- storage: upload into own folder only
insert into storage.objects (bucket_id, name, owner_id)
values ('signal-media', (select v from ctx where k = 'room') || '/aaaaaaaa-0000-0000-0000-000000000001/ghost1.png', auth.uid()::text);
insert into storage.objects (bucket_id, name, owner_id)
values ('signal-media', (select v from ctx where k = 'room') || '/aaaaaaaa-0000-0000-0000-000000000001/drop1.gif', auth.uid()::text);
select t.throws($$insert into storage.objects (bucket_id, name, owner_id)
  values ('signal-media', (select v from ctx where k='room') || '/bbbbbbbb-0000-0000-0000-000000000002/sneaky.png', auth.uid()::text)$$,
  'row-level security', 'A cannot upload into B''s folder');
select t.ok((select count(*) = 2 from storage.objects), 'uploader can see own fresh uploads');

select t.throws($$insert into public.messages (room_id, client_id, kind, media_path)
  values ((select v::uuid from ctx where k='room'), gen_random_uuid(), 'image',
          (select v from ctx where k='room') || '/bbbbbbbb-0000-0000-0000-000000000002/x.png')$$,
  'BAD_MEDIA_PATH', 'media path must be inside the sender''s folder');
select t.throws($$insert into public.messages (room_id, client_id, kind, media_path)
  values ((select v::uuid from ctx where k='room'), gen_random_uuid(), 'image',
          (select v from ctx where k='room') || '/aaaaaaaa-0000-0000-0000-000000000001/missing.png')$$,
  'MEDIA_NOT_FOUND', 'media must exist in storage');
select t.throws($$insert into public.messages (room_id, client_id, kind, body, mode)
  values ((select v::uuid from ctx where k='room'), gen_random_uuid(), 'text', 'boo', 'ghost')$$,
  'check constraint', 'ghost mode is only for images and GIFs');

-- ghost signal
insert into public.messages (room_id, client_id, kind, media_path, mode, ghost_seconds)
values ((select v::uuid from ctx where k = 'room'), gen_random_uuid(), 'image',
        (select v from ctx where k = 'room') || '/aaaaaaaa-0000-0000-0000-000000000001/ghost1.png', 'ghost', 8);
insert into ctx select 'ghost', id::text from public.messages where mode = 'ghost';
select t.throws($$select public.open_message((select v::uuid from ctx where k='ghost'))$$,
  'GHOST_SENDER', 'sender cannot open their own ghost signal');

-- signal drop (ghost GIF)
insert into public.signal_drops (room_id, client_id, x, y, building_id, body, media_path, media_kind, mode)
values ((select v::uuid from ctx where k = 'room'), gen_random_uuid(), 0.4, 0.5, 'b12', 'look up!',
        (select v from ctx where k = 'room') || '/aaaaaaaa-0000-0000-0000-000000000001/drop1.gif', 'gif', 'ghost');
insert into ctx select 'drop', id::text from public.signal_drops;
select t.ok((select media_path is null from public.open_drop((select v::uuid from ctx where k = 'drop'))),
  'sender cannot re-fetch their own ghost drop media');
select t.ok((select opened_at is null from public.signal_drops), 'sender viewing does not count as opened');

-- profiles
update public.profiles set map_x = 0.11, map_y = 0.22 where id = auth.uid();
select t.ok((select map_x between 0.10 and 0.12 from public.profiles where id = auth.uid()), 'A can move own avatar');
select t.throws($$update public.profiles set avatar_key = 'b' where id = auth.uid()$$,
  'permission denied', 'avatar cannot be changed by the user');
update public.profiles set map_x = 0.9 where id = 'bbbbbbbb-0000-0000-0000-000000000002';
reset role;
select t.ok((select map_x < 0.9 from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'A cannot move B''s avatar');

-- ================================================================== B receives
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set local role authenticated;

select t.ok((select count(*) = 3 from public.messages), 'B sees the room''s messages');
select t.ok((select count(*) = 2 from public.profiles), 'B sees both profiles');
select t.ok((select count(*) = 0 from storage.objects), 'B cannot see A''s uploaded files');
select t.ok((select count(*) = 0 from public.user_settings where user_id <> auth.uid()), 'B cannot read A''s settings');

delete from public.messages where body = 'hey you';
reset role;
select t.ok((select count(*) = 1 from public.messages where body = 'hey you'), 'B cannot delete A''s message');
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set local role authenticated;

select t.ok((select view_until between now() + interval '7 seconds' and now() + interval '9 seconds'
  from public.open_message((select v::uuid from ctx where k = 'ghost'))), 'B opens ghost: 8 second window starts');
select t.ok((select opened_at is not null from public.messages where mode = 'ghost'), 'ghost open is recorded server-side');
select t.ok((select media_path is not null from public.open_drop((select v::uuid from ctx where k = 'drop'))),
  'recipient can open the drop');

insert into public.message_reactions (message_id, emoji)
select id, '💜' from public.messages where body = 'hey you';
select t.ok((select user_id = auth.uid() from public.message_reactions), 'reaction belongs to B');

select public.mark_read((select v::uuid from ctx where k = 'room'));
select t.ok((select last_read_at > now() - interval '1 minute' from public.room_members where user_id = auth.uid()),
  'mark_read updates the read marker');

-- realtime private channel (policy logic; the real Realtime table is partitioned
-- and managed by Supabase, so this part runs on the plain-Postgres stub only)
do $rt$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'realtime' and table_name = 'messages' and column_name = 'extension') then
    raise notice 'skip - realtime channel policy (managed table)';
    return;
  end if;
  perform set_config('realtime.topic', 'room:' || (select v from ctx where k = 'room'), true);
  insert into realtime.messages (topic, payload) values (realtime.topic(), '{"typing":true}');
  perform t.ok((select count(*) >= 1 from realtime.messages), 'members can use the room channel');
  perform set_config('realtime.topic', 'room:' || gen_random_uuid(), true);
  perform t.throws($q$insert into realtime.messages (topic, payload) values (realtime.topic(), '{}')$q$,
    'row-level security', 'members cannot use other channels');
end $rt$;

-- rate limits
select t.throws($q$
  do $d$ begin
    for i in 1..31 loop
      insert into public.messages (room_id, client_id, kind, body)
      values ((select v::uuid from ctx where k='room'), gen_random_uuid(), 'text', 'spam ' || i);
    end loop;
  end $d$ $q$, 'RATE_LIMIT', 'messages are rate limited (30/min)');
select t.throws($q$
  do $d$ begin
    for i in 1..21 loop
      insert into public.pokes (room_id, kind) values ((select v::uuid from ctx where k='room'), 'star');
    end loop;
  end $d$ $q$, 'RATE_LIMIT', 'pokes are rate limited (20/min)');

insert into public.pokes (room_id, kind) values ((select v::uuid from ctx where k = 'room'), 'heart');
reset role;

-- ================================================================== heart sync
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated;
insert into public.pokes (room_id, kind) values ((select v::uuid from ctx where k = 'room'), 'fingerheart');
select t.ok((select count(*) = 2 from public.badges where badge_key = 'heart_sync'),
  'hearts within 10 seconds award heart_sync to both');
reset role;

-- ================================================================== outsider
select t.as_user('cccccccc-0000-0000-0000-000000000003');
set local role authenticated;
select t.ok((select count(*) = 0 from public.messages), 'outsider sees no messages');
select t.ok((select count(*) = 0 from public.profiles), 'outsider sees no profiles');
select t.ok((select count(*) = 0 from public.signal_drops), 'outsider sees no drops');
select t.throws($$select public.open_message((select v::uuid from ctx where k='ghost'))$$,
  'NOT_FOUND', 'outsider cannot open a ghost signal');
select t.throws($$insert into storage.objects (bucket_id, name, owner_id)
  values ('signal-media', (select v from ctx where k='room') || '/cccccccc-0000-0000-0000-000000000003/x.png', auth.uid()::text)$$,
  'row-level security', 'outsider cannot upload into the room');
select t.throws($$insert into public.pokes (room_id, kind) values ((select v::uuid from ctx where k='room'), 'heart')$$,
  'row-level security', 'outsider cannot poke');
reset role;

-- ================================================================== expiry
-- Pretend time has passed: the ghost window ended and the 24h signal expired.
update public.messages set opened_at = now() - interval '1 minute' where mode = 'ghost';
update public.messages set expires_at = now() - interval '1 second' where mode = 'day';
update public.signal_drops set opened_at = now() - interval '1 minute';

select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set local role authenticated;
select t.ok((select count(*) = 0 from public.messages where mode in ('ghost', 'day')),
  'expired signals vanish from queries');
select t.throws($$select public.open_message((select v::uuid from ctx where k='ghost'))$$,
  'EXPIRED|NOT_FOUND', 'expired ghost can never be opened again');
select t.throws($$select public.open_drop((select v::uuid from ctx where k='drop'))$$,
  'EXPIRED|NOT_FOUND', 'expired drop can never be opened again');
reset role;

select t.ok((select (public.cleanup_expired() ->> 'messages')::int = 2), 'cleanup deletes the expired messages');
select t.ok((select count(*) = 0 from public.signal_drops), 'cleanup deletes the expired drop');
select t.ok((select count(*) = 2 from public.media_trash), 'expired media is queued for storage deletion');

-- ================================================================== v2 features
-- (skipped automatically if the v2 migration isn't applied)
do $v2$ begin
  if to_regclass('public.spark_answers') is null then raise notice 'skip - v2 not applied'; end if;
end $v2$;

-- moods
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated;
update public.profiles set mood = 'love' where id = auth.uid();
select t.ok((select mood = 'love' and mood_at is not null from public.profiles where id = auth.uid()), 'A can set a mood (time recorded)');
select t.throws($$update public.profiles set mood = 'evil' where id = auth.uid()$$, 'check constraint', 'unknown moods are rejected');
update public.profiles set mood = 'sad' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
select t.throws($$update public.profiles set mood_at = now() where id = auth.uid()$$, 'permission denied', 'mood time is server-set');
select public.touch_presence(true);
select t.ok((select foreground from public.profiles where id = auth.uid()), 'foreground heartbeat recorded');

-- countdown
select public.set_countdown((select v::uuid from ctx where k = 'room'), now() + interval '3 days', 'Saturday picnic');
select t.ok((select next_meet_label = 'Saturday picnic' from public.private_rooms), 'members can set the meet-up countdown');
select t.throws($$select public.set_countdown((select v::uuid from ctx where k='room'), now() - interval '5 days', 'x')$$,
  'COUNTDOWN_IN_PAST', 'countdown cannot be far in the past');

-- voice notes
insert into storage.objects (bucket_id, name, owner_id)
values ('signal-media', (select v from ctx where k = 'room') || '/aaaaaaaa-0000-0000-0000-000000000001/v1.m4a', auth.uid()::text);
insert into public.messages (room_id, client_id, kind, media_path, mode, duration_ms)
values ((select v::uuid from ctx where k = 'room'), gen_random_uuid(), 'voice',
        (select v from ctx where k = 'room') || '/aaaaaaaa-0000-0000-0000-000000000001/v1.m4a', 'ghost', 4200);
select t.ok((select count(*) = 1 from public.messages where kind = 'voice' and mode = 'ghost'), 'ghost voice notes are allowed');
select t.throws($$insert into public.messages (room_id, client_id, kind, mode) values ((select v::uuid from ctx where k='room'), gen_random_uuid(), 'voice', 'normal')$$,
  'check constraint', 'voice notes need an audio file');

-- daily spark: hidden until you answer too
insert into public.spark_answers (room_id, answer) values ((select v::uuid from ctx where k = 'room'), 'pizza on a roof');
select t.ok((select day = public.spark_today() from public.spark_answers), 'spark day is set by the server');
select t.throws($$insert into public.spark_answers (room_id, answer) values ((select v::uuid from ctx where k='room'), 'again')$$,
  'duplicate', 'one answer per person per day');
reset role;

select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set local role authenticated;
select t.ok((select mood is null from public.profiles where id = auth.uid()), 'A could not change B''s mood');
select t.ok((select count(*) = 0 from public.spark_answers), 'partner''s spark answer stays hidden until you answer');
insert into public.spark_answers (room_id, answer) values ((select v::uuid from ctx where k = 'room'), 'sunset walk');
select t.ok((select count(*) = 2 from public.spark_answers), 'both answers revealed once both answered');
reset role;

-- streak: pretend both answered the 3 days before today as well
select t.as_user(null);
insert into public.spark_answers (room_id, day, user_id, answer)
select (select v::uuid from ctx where k = 'room'), public.spark_today() - d, u, 'x'
from generate_series(1, 3) d, (values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid), ('bbbbbbbb-0000-0000-0000-000000000002'::uuid)) us(u);
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated;
select t.ok((select public.spark_streak((select v::uuid from ctx where k = 'room')) = 4), 'streak counts consecutive days both answered');

-- tic-tac-toe
insert into ctx select 'game', (public.ttt_new((select v::uuid from ctx where k = 'room'))).id::text;
select public.ttt_move((select v::uuid from ctx where k = 'game'), 0);
select t.throws($$select public.ttt_move((select v::uuid from ctx where k='game'), 1)$$, 'NOT_YOUR_TURN', 'cannot move twice in a row');
reset role;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set local role authenticated;
select t.throws($$select public.ttt_move((select v::uuid from ctx where k='game'), 0)$$, 'BAD_MOVE', 'cannot take an occupied square');
select public.ttt_move((select v::uuid from ctx where k = 'game'), 3);
reset role;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated;
select public.ttt_move((select v::uuid from ctx where k = 'game'), 1);
reset role;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set local role authenticated;
select public.ttt_move((select v::uuid from ctx where k = 'game'), 4);
reset role;
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated;
select t.ok((select (public.ttt_move((select v::uuid from ctx where k = 'game'), 2)).winner = 'X'), 'three in a row wins');
select t.ok((select count(*) = 1 from public.badges where badge_key = 'rooftop_champ' and user_id = auth.uid()), 'winner earns rooftop_champ');
select t.throws($$select public.ttt_move((select v::uuid from ctx where k='game'), 8)$$, 'GAME_OVER', 'no moves after the game ends');
select t.throws($$update public.games set winner = 'O'$$, 'permission denied', 'games cannot be edited directly');

-- push subscriptions
select public.save_push_subscription('https://push.example/abc', 'key', 'auth', 'test');
select t.ok((select count(*) = 1 from public.push_subscriptions), 'A can save a push subscription');
select t.throws($$select public.save_push_subscription('http://insecure/x', 'k', 'a', 'ua')$$, 'BAD_ENDPOINT', 'push endpoints must be https');
select t.throws($$select * from private.config$$, 'permission denied', 'server push config is not readable');
reset role;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set local role authenticated;
select t.ok((select count(*) = 0 from public.push_subscriptions), 'B cannot see A''s devices');
reset role;

select t.as_user('cccccccc-0000-0000-0000-000000000003');
set local role authenticated;
select t.ok((select count(*) = 0 from public.games), 'outsider sees no games');
select t.ok((select count(*) = 0 from public.spark_answers), 'outsider sees no spark answers');
select t.throws($$select public.ttt_new((select v::uuid from ctx where k='room'))$$, 'NOT_FOUND', 'outsider cannot start a game');
select t.throws($$select public.set_countdown((select v::uuid from ctx where k='room'), now(), 'x')$$, 'NOT_FOUND', 'outsider cannot set the countdown');
reset role;

-- ================================================================== extra rooms + auto-replies
select t.as_user(null);
select t.ok((select public.add_person('stranger@example.com', 'Bot', 'c') = 'cccccccc-0000-0000-0000-000000000003'), 'owner can add a third person');
insert into ctx values ('room2', public.link_room('nova@example.com', 'stranger@example.com')::text);
select t.ok((select public.link_room('nova@example.com', 'stranger@example.com')::text = (select v from ctx where k = 'room2')), 'linking twice returns the same room');
select t.ok((select (select v from ctx where k = 'room2') <> (select v from ctx where k = 'room')), 'the new pair gets its own room');
select t.ok((select count(*) = 2 from public.room_members where room_id = (select v::uuid from ctx where k = 'room2')), 'second room has two members');
select public.set_auto_reply('stranger@example.com', 'nova@example.com', array['beep one', 'beep two']);

set local role authenticated;
select t.throws($$select public.add_person('x@example.com','x','c')$$, 'permission denied', 'people cannot add accounts');
select t.throws($$select public.link_room('nova@example.com','night@example.com')$$, 'permission denied', 'people cannot link rooms');
select t.throws($$select public.set_auto_reply('nova@example.com','night@example.com', array['x'])$$, 'permission denied', 'people cannot set auto-replies');
select t.throws($$select * from private.auto_replies$$, 'permission denied', 'auto-reply settings are private');
reset role;

-- the bot (stranger) only sees its own room
select t.as_user('cccccccc-0000-0000-0000-000000000003');
set local role authenticated;
select t.ok((select count(*) = 1 from public.private_rooms), 'bot sees only its own room');
select t.ok((select count(*) = 0 from public.messages where room_id = (select v::uuid from ctx where k = 'room')), 'bot cannot read the main room');
select t.ok((select count(*) = 0 from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'bot cannot see the other partner''s profile');
select t.throws($$insert into public.messages (room_id, client_id, kind, body, mode)
  values ((select v::uuid from ctx where k='room'), gen_random_uuid(), 'text', 'hi', 'normal')$$, 'row-level security', 'bot cannot post in the main room');
reset role;

-- night still cannot see the new room
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set local role authenticated;
select t.ok((select count(*) = 1 from public.private_rooms), 'partner B still sees only the main room');
select t.ok((select count(*) = 0 from public.profiles where id = 'cccccccc-0000-0000-0000-000000000003'), 'partner B cannot see the bot');
reset role;

-- nova talks to the bot and gets one reply per burst
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated;
select t.ok((select count(*) = 2 from public.private_rooms), 'A sees both of their rooms');
insert into public.messages (room_id, client_id, kind, body, mode)
values ((select v::uuid from ctx where k = 'room2'), gen_random_uuid(), 'text', 'hello bot', 'normal');
select t.ok((select count(*) = 1 from public.messages where room_id = (select v::uuid from ctx where k = 'room2')
  and sender_id = 'cccccccc-0000-0000-0000-000000000003' and body = 'beep one'), 'bot auto-replies to A');
select t.ok((select (select created_at from public.messages where body = 'beep one') > (select created_at from public.messages where body = 'hello bot')),
  'reply is timestamped after the message');
insert into public.messages (room_id, client_id, kind, body, mode)
values ((select v::uuid from ctx where k = 'room2'), gen_random_uuid(), 'text', 'again', 'normal');
select t.ok((select count(*) = 1 from public.messages where sender_id = 'cccccccc-0000-0000-0000-000000000003'), 'one reply per burst');
select t.ok((select count(*) = 0 from public.messages where room_id = (select v::uuid from ctx where k = 'room')
  and sender_id = 'cccccccc-0000-0000-0000-000000000003'), 'no replies in rooms the bot is not in');
reset role;

-- the bot's own messages never trigger replies, and B gets none
select t.as_user('cccccccc-0000-0000-0000-000000000003');
set local role authenticated;
insert into public.messages (room_id, client_id, kind, body, mode)
values ((select v::uuid from ctx where k = 'room2'), gen_random_uuid(), 'text', 'manual', 'normal');
select t.ok((select sender_id = auth.uid() from public.messages where body = 'manual'), 'people still cannot fake the sender');
reset role;
select t.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set local role authenticated;
insert into public.messages (room_id, client_id, kind, body, mode)
values ((select v::uuid from ctx where k = 'room'), gen_random_uuid(), 'text', 'only for nova', 'normal');
reset role;
select t.ok((select count(*) = 2 from public.messages where sender_id = 'cccccccc-0000-0000-0000-000000000003'), 'bot only answers the chosen person');

-- ================================================================== push keys stay server-side
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated;
select t.throws($$select public.push_check_secret('x')$$, 'permission denied', 'people cannot test the push secret');
select t.throws($$select * from public.push_vapid_keys()$$, 'permission denied', 'people cannot read the private push key');
select t.throws($$select public.push_save_vapid_keys('a','b')$$, 'permission denied', 'people cannot replace the push keys');
select t.ok((select public.push_public_key() is null), 'people can read the public push key');
reset role;
select t.ok((select length(value) = 64 from private.config where key = 'push_secret'), 'webhook secret is generated in the database');
insert into ctx select 'push_secret', value from private.config where key = 'push_secret';
set local role service_role;
select public.push_save_vapid_keys('pub1', 'priv1');
select public.push_save_vapid_keys('pub2', 'priv2');
select t.ok((select public_key = 'pub1' and private_key = 'priv1' from public.push_vapid_keys()), 'first saved key pair wins');
select t.ok((select public.push_check_secret((select v from ctx where k = 'push_secret'))), 'server can check the webhook secret');
select t.ok((select not public.push_check_secret('wrong')), 'a wrong webhook secret is rejected');
reset role;

-- ================================================================== chat-only rooms
select t.as_user(null);
select public.set_chat_only('nova@example.com', 'stranger@example.com', true);
select t.ok((select chat_only from public.private_rooms where id = (select v::uuid from ctx where k = 'room2')), 'owner can make a chat messages-only');
select t.ok((select not chat_only from public.private_rooms where id = (select v::uuid from ctx where k = 'room')), 'the main chat is unaffected');
select t.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated;
insert into public.messages (room_id, client_id, kind, body, mode)
values ((select v::uuid from ctx where k = 'room2'), gen_random_uuid(), 'text', 'still can chat', 'normal');
select t.ok((select count(*) = 1 from public.messages where body = 'still can chat'), 'messages still work in a chat-only room');
select t.throws($$insert into public.pokes (room_id, kind) values ((select v::uuid from ctx where k='room2'), 'heart')$$, 'CHAT_ONLY', 'no pokes in a chat-only room');
select t.throws($$insert into public.signal_drops (room_id, client_id, x, y, body) values ((select v::uuid from ctx where k='room2'), gen_random_uuid(), 0.5, 0.5, 'hi')$$, 'CHAT_ONLY', 'no drops in a chat-only room');
select t.throws($$select public.ttt_new((select v::uuid from ctx where k='room2'))$$, 'CHAT_ONLY', 'no games in a chat-only room');
select t.throws($$insert into public.spark_answers (room_id, answer) values ((select v::uuid from ctx where k='room2'), 'x')$$, 'CHAT_ONLY', 'no spark in a chat-only room');
select t.throws($$select public.set_countdown((select v::uuid from ctx where k='room2'), now() + interval '1 day', 'x')$$, 'CHAT_ONLY', 'no countdown in a chat-only room');
select t.throws($$select public.set_chat_only('nova@example.com', 'stranger@example.com', false)$$, 'permission denied', 'people cannot change chat-only');
reset role;

rollback;
\echo 'ALL DATABASE SECURITY TESTS PASSED'
