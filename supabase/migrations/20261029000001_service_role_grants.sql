-- With "Automatically expose new tables" turned OFF (recommended), new tables
-- get no default privileges. The browser roles already receive exactly the
-- grants they need in the first migration; this gives the server-only
-- service role what the cleanup and media routes use.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
