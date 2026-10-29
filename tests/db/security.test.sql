-- WEB//SIGNAL database security tests.
-- Runs against a local Supabase (CI) or plain Postgres + supabase-stub.sql.
-- Every check raises an exception on failure; psql runs with ON_ERROR_STOP.
\set ON_ERROR_STOP on
\set QUIET on
begin;

-- ------------------------------------------------------------------ helpers
create schema if not exists t;
grant usage on schema t to authenticated, anon;

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
grant execute on all functions in schema t to authenticated, anon;

-- ------------------------------------------------------------------ fixtures
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'nova@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'night@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'stranger@example.com');

create temp table ctx (k text primary key, v text);
grant all on ctx to authenticated;
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

rollback;
\echo 'ALL DATABASE SECURITY TESTS PASSED'
