-- Row Level Security — the actual security boundary of this app.
--
-- Legacy note: the JavaFX app had ZERO authorization. Every request just
-- passed a plain `u=<username>` parameter and the server trusted it, so any
-- client could read/write/delete any user's recipes. Here, identity comes
-- from a verified JWT (never a request parameter), checked at two layers:
-- Server Actions call requireUser() first, and RLS is the backstop that
-- holds even if application code gets that wrong.

alter table public.profiles         enable row level security;
alter table public.user_preferences enable row level security;
alter table public.recipes          enable row level security;
alter table public.pantry_items     enable row level security;

-- (select auth.uid()) rather than a bare auth.uid(): the subquery form gets
-- hoisted into an InitPlan by the planner and evaluated once per query
-- instead of once per row. On a few hundred recipes this is the difference
-- between a couple of milliseconds and tens of milliseconds.

create policy "profiles: owner full access" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "prefs: owner full access" on public.user_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "pantry: owner full access" on public.pantry_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Recipes are split per-verb (rather than `for all`) so INSERT/UPDATE get a
-- WITH CHECK that specifically stops a user from writing a row they don't
-- own, independent of what the SELECT policy allows them to read.
create policy "recipes: owner select" on public.recipes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "recipes: owner insert" on public.recipes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "recipes: owner update" on public.recipes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "recipes: owner delete" on public.recipes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- The ONLY table-level anonymous read path. Deliberately narrow: only rows
-- that are fully `public` are listable this way (powers /discover and
-- sitemap.ts). `unlisted` rows are NOT included here — see the share RPC
-- migration for why a table-level policy on `unlisted` would be a leak.
create policy "recipes: anyone can read fully-public recipes" on public.recipes
  for select to anon, authenticated
  using (visibility = 'public');

-- Lets a public recipe page show its author's byline without exposing the
-- profiles table wholesale to anonymous users.
create policy "profiles: byline for authors of public recipes" on public.profiles
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.user_id = profiles.id and r.visibility = 'public'
    )
  );
