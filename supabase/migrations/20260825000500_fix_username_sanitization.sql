-- Fixes a signup-breaking bug in handle_new_user() (migration
-- 20260813000200): the derived username was only lower()'d, never
-- sanitized to the charset profiles.username actually requires
-- (^[a-z0-9_]+$, no hyphens/dots/plus-signs). Any signup whose email
-- local-part contains one of those characters -- "jane-doe@...",
-- "jane.doe@...", "jane+test@..." -- failed the profiles_username_check
-- constraint and surfaced to the user as a generic "Database error saving
-- new user", with no indication why. Found by actually signing up through
-- the UI during Phase 4 verification, not by reading the trigger.
--
-- Fix: replace every character outside [a-z0-9_] with "_" after deriving
-- the username, then re-pad/truncate to stay within the column's 3-30
-- length check (a sanitized single-character local part like "x@..."
-- would otherwise now be too short; a very long email could push the
-- uniqueness-retry loop's suffix past 30 chars, so the base is capped at
-- 24, leaving room for it).
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
  v_username := regexp_replace(v_username::text, '[^a-z0-9_]', '_', 'g');
  v_username := left(v_username, 24);
  if char_length(v_username) < 3 then
    v_username := rpad(v_username, 3, '0');
  end if;

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
