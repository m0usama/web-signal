-- Replies (swipe / long-press "reply") and shared pins (max 3 per chat).

-- ---------------------------------------------------------------- replies
alter table public.messages
  add column if not exists reply_to uuid references public.messages (id) on delete set null;
create index if not exists messages_reply_to_idx on public.messages (reply_to);
grant insert (reply_to) on public.messages to authenticated;

-- A reply may only point at a message in the same chat; anything else is
-- quietly dropped rather than failing the send.
create or replace function public.messages_reply_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reply_to is not null and not exists (
    select 1 from public.messages m where m.id = new.reply_to and m.room_id = new.room_id
  ) then
    new.reply_to := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.messages_reply_guard() from public, anon, authenticated;

create trigger messages_reply_guard
  before insert on public.messages
  for each row execute function public.messages_reply_guard();

-- ---------------------------------------------------------------- pins
create table if not exists public.message_pins (
  message_id uuid primary key references public.messages (id) on delete cascade,
  room_id    uuid not null references public.private_rooms (id) on delete cascade,
  pinned_by  uuid not null references public.profiles (id) on delete cascade,
  pinned_at  timestamptz not null default now()
);
create index if not exists message_pins_room_idx on public.message_pins (room_id, pinned_at desc);
create index if not exists message_pins_by_idx on public.message_pins (pinned_by);

alter table public.message_pins enable row level security;
revoke all on public.message_pins from anon, authenticated;
grant select on public.message_pins to authenticated;
create policy pins_select on public.message_pins
  for select to authenticated
  using (public.is_room_member(room_id));

-- Pin a message for both people. Only the 3 newest pins in a chat stay;
-- pinning a 4th removes the oldest.
create or replace function public.pin_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room uuid;
  v_mode text;
begin
  select m.room_id, m.mode into v_room, v_mode from public.messages m where m.id = p_id;
  if v_room is null or not public.is_room_member(v_room) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if v_mode = 'ghost' then
    raise exception 'CANT_PIN_GHOST' using errcode = '22023';
  end if;
  insert into public.message_pins (message_id, room_id, pinned_by, pinned_at)
  values (p_id, v_room, auth.uid(), clock_timestamp())
  on conflict (message_id) do update set pinned_at = clock_timestamp(), pinned_by = auth.uid();
  delete from public.message_pins
  where message_id in (
    select p.message_id from public.message_pins p
    where p.room_id = v_room
    order by p.pinned_at desc
    offset 3
  );
end;
$$;

create or replace function public.unpin_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.message_pins p
  where p.message_id = p_id and public.is_room_member(p.room_id);
end;
$$;

revoke execute on function public.pin_message(uuid), public.unpin_message(uuid) from public, anon;
grant execute on function public.pin_message(uuid), public.unpin_message(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.message_pins;
  end if;
end;
$$;
