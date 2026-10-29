-- Trigger functions are run by the database itself; nobody needs to call them via the API.
revoke execute on function
  public.enforce_room_size(), public.messages_before_insert(), public.drops_before_insert(),
  public.pokes_before_insert(), public.reactions_before_write(), public.queue_media_for_deletion(),
  public.messages_after_insert(), public.pokes_after_insert(), public.drops_after_insert()
from public, anon, authenticated;

-- Helpers used inside security policies: signed-in users only (they only ever
-- answer questions about the caller's own room).
revoke execute on function public.is_room_member(uuid), public.shares_room_with(uuid) from public, anon;
grant execute on function public.is_room_member(uuid), public.shares_room_with(uuid) to authenticated;
revoke execute on function public.signal_is_live(text, timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.signal_is_live(text, timestamptz, timestamptz, integer) to authenticated;

-- Stop future functions in this schema from being callable by everyone by default.
alter default privileges in schema public revoke execute on functions from public, anon;
