-- Private bucket for the shared "tune" (e.g. a ringtone you own a copy of).
-- Upload it as  signal-tunes/tune.mp3  in the Supabase dashboard.
-- No client policies: only the server hands out short-lived signed URLs,
-- and only to the two room members. The file is never in the code repo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signal-tunes', 'signal-tunes', false, 5242880,
        array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
