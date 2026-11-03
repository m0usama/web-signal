-- Build-your-own spider: each person's look (colours, eyes, pattern, extra).
alter table public.profiles add column if not exists spider jsonb
  check (spider is null or (jsonb_typeof(spider) = 'object' and pg_column_size(spider) < 512));
grant update (spider) on public.profiles to authenticated;
