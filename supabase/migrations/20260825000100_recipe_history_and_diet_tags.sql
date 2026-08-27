-- Adds cook-history and structured diet metadata to recipes.
--
-- diet_tags makes "which of my saved recipes clash with my current
-- preferences" (design canvas 7d's "2 saved recipes clash" card) a real
-- indexed query instead of parsing the free-text `tags` column. It's a
-- separate array rather than folded into `tags` because `tags` is
-- user-authored free text (canvas 7c's "+ tag") and diet_tags is a closed
-- enum the app itself derives and queries against — mixing the two would
-- make either use unreliable.
--
-- cooked_count / last_cooked_at / notes back the "cooked twice" and
-- per-cook note surfaces on the recipe detail screen (7a) and cook mode's
-- finish screen (7b, deferred) — the columns land now so cook mode doesn't
-- need a schema change when it's built.
alter table public.recipes
  add column diet_tags     public.diet_tag[] not null default '{}',
  add column cooked_count  integer not null default 0 check (cooked_count >= 0),
  add column last_cooked_at timestamptz,
  add column notes         text check (char_length(notes) <= 2000);

create index recipes_diet_tags_idx on public.recipes using gin (diet_tags);
