-- =====================================================================
-- Chat-only rooms: messages work, everything else (pokes, signal drops,
-- games, the daily spark, the meet-up countdown) is refused here.
-- Used for the SpiderZiya <-> J.A.R.V.I.S test chat.
--   select public.set_chat_only('spiderziya@web-signal.local', 'jarvis@web-signal.local', true);
-- =====================================================================

alter table public.private_rooms add column if not exists chat_only boolean not null default false;

create or replace function public.guard_chat_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.private_rooms where id = new.room_id and chat_only) then
    raise exception 'CHAT_ONLY: this chat is for messages only';
  end if;
  return new;
end;
$$;

drop trigger if exists pokes_chat_only on public.pokes;
create trigger pokes_chat_only before insert on public.pokes
  for each row execute function public.guard_chat_only();
drop trigger if exists signal_drops_chat_only on public.signal_drops;
create trigger signal_drops_chat_only before insert on public.signal_drops
  for each row execute function public.guard_chat_only();
drop trigger if exists games_chat_only on public.games;
create trigger games_chat_only before insert on public.games
  for each row execute function public.guard_chat_only();
drop trigger if exists spark_answers_chat_only on public.spark_answers;
create trigger spark_answers_chat_only before insert on public.spark_answers
  for each row execute function public.guard_chat_only();

create or replace function public.guard_chat_only_countdown()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.chat_only and auth.uid() is not null
     and (new.next_meet_at is distinct from old.next_meet_at or new.next_meet_label is distinct from old.next_meet_label) then
    raise exception 'CHAT_ONLY: this chat is for messages only';
  end if;
  return new;
end;
$$;

drop trigger if exists private_rooms_chat_only on public.private_rooms;
create trigger private_rooms_chat_only before update on public.private_rooms
  for each row execute function public.guard_chat_only_countdown();

create or replace function public.set_chat_only(p_email_a text, p_email_b text, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.private_rooms r
  set chat_only = p_on
  where r.id = (
    select a.room_id
    from public.room_members a
    join public.room_members b on b.room_id = a.room_id
    join auth.users ua on ua.id = a.user_id
    join auth.users ub on ub.id = b.user_id
    where lower(ua.email) = lower(p_email_a) and lower(ub.email) = lower(p_email_b)
    limit 1
  );
  if not found then
    raise exception 'No chat between those two people';
  end if;
end;
$$;

revoke all on function public.guard_chat_only(), public.guard_chat_only_countdown(),
  public.set_chat_only(text, text, boolean) from public, anon, authenticated;
