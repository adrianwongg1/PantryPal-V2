-- recipes: the core table. ingredients/steps are jsonb, validated by the
-- same Zod schema (src/lib/ai/schema.ts) that validates AI output and the
-- edit form — one contract enforced at all three boundaries.
--
-- Legacy note: the JavaFX app stored ingredients/instructions as single
-- delimited strings ("+" between fields, "_" between records) and used
-- `title` as its de-facto primary key. Both are the root cause of several
-- confirmed bugs in the old app (see the migration plan). Neither pattern
-- exists here: id is a real uuid PK, and there is no positional parsing
-- anywhere in this schema.
create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 140),
  summary       text check (char_length(summary) <= 400),
  meal_type     public.meal_type not null,
  cuisine       text check (char_length(cuisine) <= 40),
  difficulty    public.difficulty not null default 'easy',
  prep_minutes  smallint not null default 0 check (prep_minutes between 0 and 1440),
  cook_minutes  smallint not null default 0 check (cook_minutes between 0 and 1440),
  total_minutes smallint generated always as (prep_minutes + cook_minutes) stored,
  servings      smallint not null default 2 check (servings between 1 and 50),
  ingredients   jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(ingredients) = 'array'
                         and jsonb_array_length(ingredients) between 1 and 60),
  steps         jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(steps) = 'array'
                         and jsonb_array_length(steps) between 1 and 40),
  tags          text[] not null default '{}',
  image_path    text,                          -- Storage object path, never a raw URL
  source        public.recipe_source not null default 'manual',
  model         text,                          -- which AI model produced it, for cost/quality tracking
  visibility    public.visibility not null default 'private',
  share_slug    text unique check (share_slug ~ '^[a-z0-9-]{8,120}$'),
  legacy_id     text unique,                   -- legacy Mongo _id, makes a re-import idempotent
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint share_slug_required_when_shared
    check (visibility = 'private' or share_slug is not null)
);

create index recipes_user_created_idx on public.recipes (user_id, created_at desc);
create index recipes_user_title_idx   on public.recipes (user_id, lower(title));
create index recipes_user_meal_idx    on public.recipes (user_id, meal_type, created_at desc);
create index recipes_public_idx       on public.recipes (created_at desc) where visibility = 'public';
create index recipes_search_idx       on public.recipes using gin
  (to_tsvector('english', title || ' ' || coalesce(summary, '')));
create index recipes_ingredients_idx  on public.recipes using gin (ingredients jsonb_path_ops);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();
