-- Backfill profiles + user_preferences for any auth.users row that predates
-- migration 20260813000200's on_auth_user_created trigger. That trigger
-- only fires on new inserts, and this project's auth.users table existed
-- for roughly ten months before the trigger did, so any account created in
-- that window has no profiles/user_preferences row at all. Every page that
-- reads user_preferences assumes that row always exists (.single(), throw
-- on error) -- /generate, /preferences, /preferences/settings, and even
-- /onboarding itself -- so such an account 500s on all of them. Confirmed
-- live: the account behind adrianwong055@gmail.com hit exactly this on
-- /generate (Postgres error PGRST116, "the result contains 0 rows").
--
-- Mirrors handle_new_user()'s current username-derivation logic (see
-- 20260825000500_fix_username_sanitization.sql) inline rather than calling
-- that function directly -- it's a trigger function tied to the implicit
-- NEW record and can't be invoked standalone outside a trigger context.
-- Idempotent: both inserts are scoped to rows that don't already exist, so
-- re-running this migration (or applying it on top of a DB where the gap
-- has already closed) is a safe no-op.
do $$
declare
  r record;
  v_username extensions.citext;
begin
  for r in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    v_username := lower(coalesce(r.raw_user_meta_data ->> 'username', split_part(r.email, '@', 1)));
    v_username := regexp_replace(v_username::text, '[^a-z0-9_]', '_', 'g');
    v_username := left(v_username, 24);
    if char_length(v_username) < 3 then
      v_username := rpad(v_username, 3, '0');
    end if;

    while exists (select 1 from public.profiles p where p.username = v_username) loop
      v_username := v_username || floor(random() * 10)::text;
    end loop;

    insert into public.profiles (id, username, display_name)
      values (r.id, v_username, r.raw_user_meta_data ->> 'display_name');
  end loop;
end $$;

insert into public.user_preferences (user_id)
select u.id
from auth.users u
left join public.user_preferences up on up.user_id = u.id
where up.user_id is null;
