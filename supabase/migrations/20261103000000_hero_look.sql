-- Build-your-own hero: each person's look (skin, hair, two suit colours,
-- eyes, mask, pattern, hat, face extras, outfit). Small JSON object.
alter table public.profiles add column if not exists look jsonb
  check (look is null or (jsonb_typeof(look) = 'object' and pg_column_size(look) < 600));
grant update (look) on public.profiles to authenticated;
