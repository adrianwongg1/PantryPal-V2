-- Explicit table-level GRANTs for every table created by earlier
-- migrations. supabase/config.toml's auto_expose_new_tables is unset,
-- which matches the current Supabase default: tables created in the
-- public schema are NOT automatically reachable by the anon/authenticated
-- Data API roles -- they need an explicit GRANT, same as any other
-- Postgres privilege. RLS policies control WHICH ROWS a role can see;
-- without the table-level GRANT underneath, RLS never even gets
-- evaluated -- Postgres denies the query at the coarser privilege check
-- first ("permission denied for table X", not an RLS "0 rows" result).
--
-- This was a real, previously undetected gap across every table in this
-- schema, present since the tables themselves were created: neither CI
-- (typecheck/build/tests, `db reset` + `db lint`) nor any migration up to
-- this one exercises an authenticated Data API request. Found by actually
-- completing a signup in a browser and hitting "permission denied for
-- table user_preferences" on the very next query.
--
-- Scoped to exactly what each table's own RLS policies already assume is
-- reachable: authenticated gets full CRUD on every owner-scoped table;
-- anon additionally gets SELECT only on the two tables that actually have
-- an anon-read policy (recipes' public-visibility rows, profiles' byline
-- for those rows' authors). anon gets nothing on user_preferences or
-- pantry_items -- neither has an anon RLS policy, so granting table access
-- there would be a no-op at best and needless widening of intent at worst.
grant select, insert, update, delete on public.profiles         to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.recipes          to authenticated;
grant select, insert, update, delete on public.pantry_items     to authenticated;

grant select on public.profiles to anon;
grant select on public.recipes  to anon;
