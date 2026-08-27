-- generation_events: an append-only log of recipe-generation attempts,
-- backing a simple per-user rate limit (lib/ai/rate-limit.ts). Without
-- this, an authenticated user could burn through the shared Groq free-tier
-- quota with rapid repeated calls -- nothing else in this schema limits
-- request volume, and Groq's own rate limit is project-wide, not per-user.
--
-- One row per user-facing generate action (the outer Server Action), not
-- per internal retry -- lib/ai/generate.ts's Groq-retry-then-Anthropic
-- chain is one logical attempt from the user's point of view, and
-- penalizing a user extra because a model happened to return invalid JSON
-- on the first try would be wrong.
create table public.generation_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  provider   text not null check (provider in ('groq', 'anthropic')),
  succeeded  boolean not null,
  created_at timestamptz not null default now()
);

create index generation_events_user_created_idx
  on public.generation_events (user_id, created_at desc);

alter table public.generation_events enable row level security;

create policy "generation_events: owner select" on public.generation_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "generation_events: owner insert" on public.generation_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Granted here, in the same migration as the table's own creation --
-- 20260825000600_grant_table_privileges.sql exists specifically because
-- every earlier table DIDN'T get this alongside its own creation, and RLS
-- policies sat structurally unreachable for the entire lifetime of this
-- schema as a result. No delete: the log is append-only by design, so
-- authenticated only ever needs select+insert on it, not the full CRUD
-- grant the four Phase 0-3 tables have.
grant select, insert on public.generation_events to authenticated;
