-- profiles: one row per auth.users, created automatically on signup.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     extensions.citext unique not null
                 check (char_length(username) between 3 and 30 and username ~ '^[a-z0-9_]+$'),
  display_name text check (char_length(display_name) <= 60),
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'One row per authenticated user. Replaces the legacy plaintext credentials collection — supabase.auth owns the password.';

-- user_preferences: dietary constraints fed into recipe generation as hard
-- constraints (never negotiable — see lib/ai/prompt.ts in the app).
create table public.user_preferences (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  diets                public.diet_tag[] not null default '{}',
  allergies            text[] not null default '{}',
  disliked_ingredients text[] not null default '{}',
  preferred_cuisines   text[] not null default '{}',
  default_servings     smallint not null default 2 check (default_servings between 1 and 20),
  max_total_minutes    smallint check (max_total_minutes between 5 and 600),
  spice_level          smallint not null default 1 check (spice_level between 0 and 3),
  extra_notes          text check (char_length(extra_notes) <= 500),
  updated_at           timestamptz not null default now()
);

comment on column public.user_preferences.allergies is
  'Free-form text, not an enum: allergen lists are open-ended and must never block a user from typing one that is not on a pre-set list.';

-- Auto-create profile + preferences row when a new auth user signs up.
-- security definer + empty search_path: the standard hardening pattern for
-- a trigger function that must write to a table the invoking role can't.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username extensions.citext;
begin
  v_username := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1)
  ));
  -- Guarantee uniqueness even if the derived username collides.
  while exists (select 1 from public.profiles p where p.username = v_username) loop
    v_username := v_username || floor(random() * 10)::text;
  end loop;

  insert into public.profiles (id, username, display_name)
    values (new.id, v_username, new.raw_user_meta_data ->> 'display_name');
  insert into public.user_preferences (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Shared updated_at trigger, reused by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();
