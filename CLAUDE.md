# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

PantryPal Web is a rebuild of a JavaFX desktop app as a hosted, AI-powered recipe app (tell it what's in your kitchen, get a cookable recipe; dietary preferences; a saved pantry; public share links). Status: early build-out. Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4, Supabase (Postgres/auth/storage/RLS), Vercel AI SDK (Groq `llama-3.3-70b-versatile` default, Anthropic Claude Haiku 4.5 fallback). Package manager is pnpm.

## Commands

```bash
pnpm dev                    # localhost:3000
pnpm build
pnpm typecheck              # tsc --noEmit
pnpm lint                   # eslint
pnpm test                   # vitest, watch mode
pnpm test --run             # vitest, once (CI mode)
pnpm test --run path/to/x.test.ts   # single file
pnpm test --run -t "name"           # single test by name
pnpm test:e2e                # playwright, against a real build on port 3101
```

Database (needs the local stack via `supabase start` first):

```bash
supabase start
supabase db reset           # rebuilds the DB from every file in supabase/migrations/, in order — the only way schema changes get applied; never hand-edit live schema
supabase gen types typescript --local > src/lib/supabase/database.types.ts   # must be --local, not --project-id: --project-id omits the graphql_public block and will never match what CI checks
supabase db lint
```

CI (`.github/workflows/ci.yml`) runs, in order: typecheck → lint → build → `vitest --run` → Playwright (`pnpm test:e2e`, reusing the build above, port 3101) → `supabase start` → `supabase db reset` → `supabase db lint` → diff the freshly-generated types against the committed `database.types.ts` (fails the build if a migration wasn't followed by regenerating types). It injects fake-but-well-formed env values so typecheck/build succeed without real secrets; nothing in CI talks to a live Supabase project or a real AI provider.

## Architecture

### Env validation is split by trust boundary, not just by name

- `src/lib/env.ts` — `NEXT_PUBLIC_*` vars only, safe for Client Components, Zod-validated, throws at import time with a readable error instead of failing later at request time.
- `src/lib/env.server.ts` — server secrets (`GROQ_API_KEY`, `ANTHROPIC_API_KEY`). Imports `"server-only"`, so any accidental import from a Client Component is a hard build error, not a lint warning.
- `SUPABASE_SECRET_KEY` is deliberately in neither schema. It's `service_role` (RLS-bypassing) and only needed by one-off admin scripts (e.g. a future `scripts/migrate-mongo.ts`) — the running app always talks to Supabase as the signed-in user, never as service_role. Putting it in the eagerly-validated schema would make the whole app refuse to boot wherever that secret isn't set.

Both env test files (`env.test.ts`, `env.server.test.ts`) reset the module registry and re-stub env vars per test case (`vi.resetModules()` + `vi.stubEnv()`), because these modules validate `process.env` at import time — follow that pattern for any new env-dependent module you want to unit test.

### Supabase client boundary

- `src/lib/supabase/client.ts` — `createClient()` for Client Components, uses the publishable key (no privileges of its own; RLS does the real gating).
- `src/lib/supabase/server.ts` — async `createClient()` for Server Components/Actions/Route Handlers, backed by the request's session cookies. Also exports `requireUser()`, which throws if there's no authenticated user — call it first in every Server Action and protected page.
- A `proxy.ts` (Next 16's rename of `middleware.ts`) is referenced in comments as refreshing the session only — it is explicitly **not** meant to be an authorization layer. Don't rely on it for access control; `requireUser()` + RLS are the real boundary.

### Schema lives only in `supabase/migrations/*.sql`

Numbered by timestamp, applied in order via `supabase db reset`. Four tables: `profiles`, `user_preferences`, `recipes`, `pantry_items`.

- `recipes.ingredients` / `recipes.steps` are `jsonb`, not child tables — one row per recipe, atomic writes, and the same Zod schema is meant to validate this data at every boundary (AI output, DB, edit form).
- Sharing is controlled by `recipes.visibility` (`private` / `unlisted` / `public`) + `recipes.share_slug`, with a check constraint requiring a slug whenever visibility isn't private.
- RLS (migration `..._rls_policies.sql`) is the actual security boundary — the legacy JavaFX app had none, so every table gets owner-only policies (using `(select auth.uid())`, not a bare `auth.uid()`, so the planner hoists it into an InitPlan instead of re-evaluating per row) plus exactly one anon-read policy, scoped to `visibility = 'public'` rows only.
- **`unlisted` recipes are intentionally unreachable through any table policy.** A policy like `using (visibility in ('public','unlisted'))` would let anonymous clients enumerate every "secret" link via PostgREST. Instead they're readable only through `public.get_shared_recipe(slug)` (migration `..._share_rpc.sql`): `SECURITY DEFINER`, explicit return-column allowlist that omits `user_id`/`visibility`, exact-match slug (no `LIKE`), `limit 1`, `search_path = ''`. Any change to that function needs review — see the comment above it in the migration.
- Trigger functions (`handle_new_user`, `set_updated_at`) have `EXECUTE` revoked from `public`/`anon`/`authenticated` (migration `..._lock_down_trigger_functions.sql`) so they can't be invoked directly as PostgREST RPCs — only Postgres's own trigger firing can call them.

### Design tokens: two layers in one `@theme` block

`src/app/globals.css` defines Tailwind v4 tokens in two layers:

1. **Generic** — ported from the "Organic" Claude Design system (warm cream/sand ground, terracotta accent, sage second accent, Caprasimo display over Figtree body, generous radii). Retune in Organic and re-port; don't edit these values here. Role names stay the repo's own (`--color-ink`, `--color-bg`, ...) rather than Organic's `--color-text`, so `text-ink` etc. keep working as Tailwind utilities — the values underneath are Organic's, 1:1.
2. **Domain** — the five-category meal-type color scale (breakfast/lunch/dinner/snack/dessert), lifted directly from the design canvas's own tag usage.

Both light and dark values are defined for every token. Dark applies via `prefers-color-scheme` by default; `:root[data-theme="light"|"dark"]` overrides win in both directions, for a future in-app toggle to layer on top of the OS preference without fighting it. A `.on-dark` class exists separately for screens that are deliberately dark regardless of the app's theme (e.g. cook mode) — wrap that screen's root in it rather than fighting the light/dark override chain.

Two deliberate accessibility deviations from the design system as drawn (both measured, not eyeballed — see `docs/progress/001_design_system_port.md`): text set in the bare accent color uses `--color-accent-700` instead (Organic's own stated rule for text-sized accent usage, just not followed everywhere in its own shipped CSS), and `.btn-primary`'s label is ink at rest, flipping to cream once the hover/active background darkens past the point where ink stops passing AA.

### End-to-end tests

`e2e/*.spec.ts` (Playwright, config at `playwright.config.ts`) run against a real `next build && next start`, on port **3101** — deliberately not 3000, since `reuseExistingServer` will happily attach to *any* server already listening on the configured port, including an unrelated project's dev server, and every assertion then fails against the wrong site with no obvious cause. `pnpm test:e2e` builds locally; CI (`PORT=3101 pnpm start` only) reuses the build the workflow already did.

### Path alias

`@/*` → `src/*` (see `tsconfig.json`).
