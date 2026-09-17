-- Bug fix: RLS policies only ever *restrict* access on top of a baseline Postgres GRANT —
-- with no grant at all, Postgres denies access before RLS policies are even consulted
-- ("permission denied for table ..."), regardless of how permissive the policies are.
-- Discovered by hand-testing RLS as the `authenticated` role, which supabase.com/dashboard
-- normally grants automatically when tables are created through the Studio UI, but which a
-- plain SQL migration (as run here, via the CLI) does not set up on its own.
--
-- This grants broad table-level access to anon/authenticated/service_role and relies
-- entirely on the RLS policies already in place to do the real row-level restriction —
-- exactly Supabase's own documented model (grant at the table, restrict with policies).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- So any table/sequence/function created by future migrations (run by this same `postgres`
-- role) gets the same baseline grants automatically, without needing to repeat this file.
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
