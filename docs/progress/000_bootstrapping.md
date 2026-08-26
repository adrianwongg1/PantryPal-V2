# 000 - Bootstrapping

## Overview
Written retroactively to keep the progress-doc numbering honest from the first
file. Covers everything already merged before the design-canvas implementation
work began: the Next.js/Supabase/Tailwind scaffold (Phase 0) and the auth +
RLS path (Phase 1). Both are done; this doc is a record, not a tracker.

## Status
- **Started**: 2026-08-13
- **Current Step**: Complete
- **Completion**: 100%
- **Expected Completion**: n/a (retroactive)

## Objectives
- [x] Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 scaffold
- [x] Supabase project wiring: env validation split by trust boundary
- [x] Full schema in `supabase/migrations/*.sql` with RLS as the real security boundary
- [x] Design token port (Modernist) as a placeholder theme, proven on `/`
- [x] Email/password auth (login, signup, callback, signout) end to end against RLS
- [x] `proxy.ts` session refresh, explicitly not an authorization layer

## Implementation Progress

### Step 1: Scaffold and schema (Phase 0)
**Status**: Completed
**Date Range**: 2026-08-13 - 2026-08-13

#### Tasks Completed
- Next.js 16 + React 19 + TypeScript + Tailwind v4 project scaffold
- `src/lib/env.ts` / `src/lib/env.server.ts` — env validation split by trust
  boundary (public vs server-secret), throwing at import time with a readable
  error instead of failing later at request time
- Eight migrations: extensions/enums, `profiles` + `user_preferences` (with
  `handle_new_user` trigger), `recipes`, `pantry_items`, RLS policies
  (`(select auth.uid())` InitPlan form, per-verb policies on `recipes`, the
  single anon-read policy scoped to `visibility = 'public'`), the
  `get_shared_recipe(slug)` security-definer RPC for unlisted links, storage
  bucket + policies for recipe images, and revoking EXECUTE on the two
  trigger-only functions
- `src/app/globals.css` — Modernist design tokens ported as a two-layer
  `@theme` block (generic + PantryPal's meal-type domain layer), light/dark
  via `prefers-color-scheme` and `:root[data-theme]` override
- `src/app/page.tsx` placeholder proving the token port renders correctly
- CI (`.github/workflows/ci.yml`): typecheck → lint → build → vitest →
  `supabase db reset` → `supabase db lint` → diff generated types against
  the committed `database.types.ts`

#### Current Work
None — step complete.

#### Next Tasks
None — superseded by Step 2.

### Step 2: Auth and the RLS-gated shell (Phase 1)
**Status**: Completed
**Date Range**: 2026-08-13 - 2026-08-25

#### Tasks Completed
- `src/lib/supabase/client.ts` / `server.ts` — the Client vs Server/Action
  Supabase boundary, `requireUser()` as the first line of every protected
  Server Action and page
- `src/proxy.ts` — session-cookie refresh only, explicitly documented as not
  an authorization layer (`requireUser()` + RLS are the real gate)
- `(auth)` route group: `/login`, `/signup` (Server Actions + `useActionState`),
  generic error copy that doesn't leak whether an email is registered
- `/auth/callback` (code exchange for email confirmation / magic links) and
  `/auth/signout` (plain POST form target, 303 redirect)
- `(app)` route group: layout-level redirect-to-`/login` gate (deliberately
  not `requireUser()`, which throws rather than redirects) + minimal
  `AppShell`
- `/recipes` page proving a signed-in user reads their own (RLS-scoped) slice
  of `recipes` end to end
- Verified clean: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test --run`
  (9/9 passing) before commit

#### Current Work
None — step complete. Working tree was dirty (uncommitted Phase 1 files) at
the start of the design-canvas implementation project; committed as-is per
that project's plan before any re-theme work began.

#### Next Tasks
None under this doc. Follow-on work is tracked starting at
`001_design_system_port.md`.

## Technical Notes
- Package manager is pnpm; `packageManager` pinned in `package.json`.
- `SUPABASE_SECRET_KEY` is deliberately absent from `env.server.ts` — it's
  service_role (RLS-bypassing) and only needed by future one-off admin
  scripts, never by the running app.
- The Modernist token layer and the placeholder UI (`page.tsx`, `AppShell`,
  login/signup pages, `/recipes`) are known to be temporary — they exist to
  prove the auth/RLS/CI path, not as final UI, and are the layer replaced in
  `001_design_system_port.md`.

## Dependencies
- External: Supabase (Postgres/auth/storage), Vercel AI SDK providers (Groq,
  Anthropic) referenced in docs but not yet wired into code.
- Blocks: every phase in the design-canvas implementation plan builds on this
  schema, auth boundary, and CI gate.

## Risks & Mitigation
- None outstanding for this scope. Risks specific to the design-canvas
  implementation (design-system collision, schema gaps, ingredient/pantry
  matching, etc.) are tracked in that project's plan, not here.

## Resources
- Plan: `~/.claude/plans/use-the-claude-design-mcp-proud-bonbon.md`
- `CLAUDE.md`, `README.md` — architecture and command reference

## Change Log
- **2026-08-13**: Phase 0 scaffold and schema committed.
- **2026-08-25**: Phase 1 auth/shell work committed; this doc written
  retroactively to open the progress-doc series before Phase 2 begins.
