-- get_shared_recipe: the one function that reads rows RLS otherwise denies.
--
-- The tempting alternative — a table policy `using (visibility in
-- ('public','unlisted'))` — is a DATA LEAK: it grants anon a table-level
-- SELECT over every unlisted row, so anyone could enumerate every "secret"
-- link in the system through PostgREST (`select * from recipes where
-- visibility = 'unlisted'`). The slug would stop being a secret.
--
-- Instead, `unlisted` recipes get NO table access at all. They are only
-- readable through this slug-taking function, which returns at most one
-- row and never a set.
--
-- Any future edit to this function needs review. Four properties make it
-- safe and must all be preserved:
--   1. Explicit return column list — NEVER `user_id` or `visibility`.
--   2. Exact equality match on the slug — never LIKE/ILIKE (no prefix
--      enumeration).
--   3. `limit 1` — never returns a set.
--   4. `set search_path = ''` with fully-qualified table names — the
--      standard hardening against search_path hijacking of a
--      `security definer` function.
create or replace function public.get_shared_recipe(p_slug text)
returns table (
  id              uuid,
  title           text,
  summary         text,
  meal_type       public.meal_type,
  cuisine         text,
  difficulty      public.difficulty,
  prep_minutes    smallint,
  cook_minutes    smallint,
  total_minutes   smallint,
  servings        smallint,
  ingredients     jsonb,
  steps           jsonb,
  tags            text[],
  image_path      text,
  created_at      timestamptz,
  updated_at      timestamptz,
  author_username extensions.citext,
  author_display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, r.title, r.summary, r.meal_type, r.cuisine, r.difficulty,
    r.prep_minutes, r.cook_minutes, r.total_minutes, r.servings,
    r.ingredients, r.steps, r.tags, r.image_path, r.created_at, r.updated_at,
    p.username, p.display_name
  from public.recipes r
  join public.profiles p on p.id = r.user_id
  where r.share_slug = p_slug
    and r.visibility in ('public', 'unlisted')
  limit 1;
$$;

revoke all on function public.get_shared_recipe(text) from public;
grant execute on function public.get_shared_recipe(text) to anon, authenticated;

comment on function public.get_shared_recipe(text) is
  'Security-sensitive: the only surface that reads unlisted recipes. See migration comment before editing.';
