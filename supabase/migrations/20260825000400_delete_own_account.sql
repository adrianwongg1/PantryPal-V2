-- delete_own_account: lets a signed-in user delete their own account
-- without giving the running app service_role. env.server.ts deliberately
-- excludes SUPABASE_SECRET_KEY from the app's schema (see its own comment)
-- specifically so the app never holds an RLS-bypassing key; this function
-- is how the design canvas's Settings danger zone (6c) is implemented
-- without that tradeoff — the DELETE happens inside Postgres, as the
-- function's definer, not via an admin API call from the app.
--
-- Deletes only the caller's own row: there is no id parameter, so there is
-- nothing for a caller to point at another user's account — the target is
-- always (select auth.uid()). profiles.id references auth.users(id) on
-- delete cascade, and recipes.user_id / user_preferences.user_id /
-- pantry_items.user_id all reference profiles(id) on delete cascade, so
-- one delete here cascades the caller's entire footprint in this schema.
--
-- Known gap, not fixed here: objects in the recipe-images storage bucket
-- are not foreign-keyed to recipes and won't be cleaned up by this
-- cascade. Harmless today (photo upload isn't built yet — see the
-- implementation plan), but worth remembering once it is.
--
-- Any change to this function needs the same review as get_shared_recipe:
-- it must keep operating on (select auth.uid()) only, never take a target
-- id as an argument, and stay restricted to the authenticated role.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'delete_own_account: no authenticated user';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Security-sensitive: deletes the calling user''s own account, cascading through profiles to every owned row. See migration comment before editing.';
