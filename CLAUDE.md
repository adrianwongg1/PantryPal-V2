# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

PantryPal Web is a rebuild of a JavaFX desktop app as a hosted, AI-powered recipe app (tell it what's in your kitchen, get a cookable recipe; dietary preferences; a saved pantry; public share links). Status: early build-out. Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4, Supabase (Postgres/auth/storage/RLS), Vercel AI SDK v7 (Groq `openai/gpt-oss-120b` default, Anthropic Claude Haiku 4.5 optional fallback). Package manager is pnpm.

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

CI (`.github/workflows/ci.yml`) runs, in order: typecheck → lint → build (placeholder env) → `vitest --run` → `supabase start` → `supabase db reset` → `supabase db lint` → diff the freshly-generated types against the committed `database.types.ts` (fails the build if a migration wasn't followed by regenerating types) → export the now-running local stack's own URL/key over the placeholder ones → a second build against that real local stack → Playwright (`pnpm test:e2e`, port 3101) → `supabase stop`. Only the AI provider keys stay fake-but-well-formed throughout (nothing in CI calls Groq/Anthropic) — from the second build onward, Supabase is real: e2e signs up real users and reads their data back through RLS, which is deliberate, not a leak. Two real bugs (`handle_new_user` rejecting hyphenated emails; Postgres never having granted table privileges to `anon`/`authenticated` at all) were only catchable by a step that actually talks to a freshly-migrated database — no amount of placeholder-env typecheck/build/unit-test coverage would have caught either.

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
- **Postgres RLS policies for the same command are OR'd together, not ANDed.** `recipes` has both an owner-only `select` policy and the public-read `select` policy above — a query that relies on RLS alone to mean "my recipes" also, correctly per those policies, returns every other user's `public` recipes too. Confirmed as a real bug in Phase 6: a second account saw a first account's public recipe on its own `/recipes` library page and could open its detail page (with the owner's Edit/Duplicate/Delete controls, though the actual mutations still correctly failed at RLS's owner-only update/delete policies). Every "mine only" query against `recipes` needs its own explicit `.eq("user_id", user.id)` — RLS is the backstop, never the sole scoping logic, on any table where a broader read policy coexists with an owner policy.
- **`unlisted` recipes are intentionally unreachable through any table policy.** A policy like `using (visibility in ('public','unlisted'))` would let anonymous clients enumerate every "secret" link via PostgREST. Instead they're readable only through `public.get_shared_recipe(slug)` (migration `..._share_rpc.sql`): `SECURITY DEFINER`, explicit return-column allowlist that omits `user_id`/`visibility`, exact-match slug (no `LIKE`), `limit 1`, `search_path = ''`. Any change to that function needs review — see the comment above it in the migration.
- Trigger functions (`handle_new_user`, `set_updated_at`) have `EXECUTE` revoked from `public`/`anon`/`authenticated` (migration `..._lock_down_trigger_functions.sql`) so they can't be invoked directly as PostgREST RPCs — only Postgres's own trigger firing can call them.

### Design tokens: two layers in one `@theme` block

`src/app/globals.css` defines Tailwind v4 tokens in two layers:

1. **Generic** — ported from the "Organic" Claude Design system (warm cream/sand ground, terracotta accent, sage second accent, Caprasimo display over Figtree body, generous radii). Retune in Organic and re-port; don't edit these values here. Role names stay the repo's own (`--color-ink`, `--color-bg`, ...) rather than Organic's `--color-text`, so `text-ink` etc. keep working as Tailwind utilities — the values underneath are Organic's, 1:1.
2. **Domain** — the five-category meal-type color scale (breakfast/lunch/dinner/snack/dessert), lifted directly from the design canvas's own tag usage.

Both light and dark values are defined for every token. Dark applies via `prefers-color-scheme` by default; `:root[data-theme="light"|"dark"]` overrides win in both directions, for a future in-app toggle to layer on top of the OS preference without fighting it. A `.on-dark` class exists separately for screens that are deliberately dark regardless of the app's theme (e.g. cook mode) — wrap that screen's root in it rather than fighting the light/dark override chain.

Two deliberate accessibility deviations from the design system as drawn (both measured, not eyeballed — see `docs/progress/001_design_system_port.md`): text set in the bare accent color uses `--color-accent-700` instead (Organic's own stated rule for text-sized accent usage, just not followed everywhere in its own shipped CSS), and `.btn-primary`'s label uses the dedicated `--color-accent-ink`/`--color-accent-contrast` tokens (not `--color-ink`/`--color-bg` directly — those two swap which one is "dark" between light and dark mode, `--color-accent` doesn't swap the same way, and reusing them here was a real dark-mode contrast regression this project shipped and then caught — see `docs/progress/003_shell_nav_auth_onboarding.md`).

### AI generation (`src/lib/ai/`)

- `schema.ts` — the one Zod contract for recipe content, validated at generation (this section), the DB row, and the edit form (Phase 6).
- `prompt.ts` — pure, unit-tested prompt construction. Preferences are hard constraints; allergies are stated as a safety prohibition, not a preference, in a separate line from everything else; pantry contents are framed as available, not required.
- `generate.ts` — Groq (`generateText` + `output: Output.object({ schema })`, **not** the deprecated `generateObject` — this codebase is on AI SDK v7, where `generateObject`'s own doc comment says to use this instead) → one retry against Groq, but only for a validation-shaped failure (`NoOutputGeneratedError`) — a transport/auth error skips straight to the fallback, since retrying the same broken call won't help → Anthropic, if `ANTHROPIC_API_KEY` is configured, as the true fallback for the whole chain regardless of *why* Groq failed. `generateWithProvider` is the separate, single-attempt path behind "Try a different model" on `/generate` — a deliberately distinct control from "Try again" in the design.
- Groq's structured-output path runs with `providerOptions.groq.strictJsonSchema: false`. Groq's strict mode is the OpenAI-lineage convention requiring *every* schema property (even Zod `.optional()`/`.default()` ones) to be listed in `required` — `recipeContentSchema` doesn't follow that convention and reworking it to would ripple into `pantry-match.ts`, the DB-insert mapping, and the future edit form for a Groq-specific quirk Anthropic's own structured-output path doesn't share. The existing validation-retry above is the safety net for the resulting small increase in malformed-output risk.
- `sanitizeRecipe()` strips a trailing `(optional)`-shaped suffix models sometimes write directly into an ingredient's `name` (observed live: `"Soy sauce (optional)"`), which would otherwise double up with the UI's own conditional `" (optional)"` suffix for `ingredient.optional`. Applied to every `callModel()` result — real or mocked — right after parsing, before the name is used anywhere; a prompt-only instruction (also present in `prompt.ts`) isn't reliably followed and the redundant text would otherwise persist into saved recipes, not just be a display glitch.
- `MOCK_AI_RESPONSES` (raw `process.env` read, not a `serverEnv` field — it's a test seam, not real app config) makes `callModel()` return a fixed, deterministic recipe instead of calling Groq/Anthropic. Set only via `playwright.config.ts`'s `webServer.env`, so only Playwright's own spawned server ever sees it — `pnpm dev` and a normal `pnpm start` always call the real APIs. See "End-to-end tests" below for why.
- `rate-limit.ts` — a simple per-user cap (`generation_events`, migration `20260826000100`) so one user can't burn the shared Groq free-tier quota. Logs one event per user-facing generate action, not per internal Groq/Anthropic attempt.
- **`GROQ_TEXT_MODEL`'s default is `openai/gpt-oss-120b`, not `llama-3.3-70b-versatile`.** The latter was this project's original default and was removed from Groq's catalog at some point — confirmed directly against Groq's `/v1/models` endpoint, which 404s for it and lists no `llama-3.3` model at all. If a future model swap is ever needed, verify the replacement against that endpoint and with a real `generateText` call against this app's own schema first — don't assume a model name from memory or documentation without checking, the way the original default's removal was originally discovered (a live generation attempt failing, not a scheduled check).

### End-to-end tests

`e2e/*.spec.ts` (Playwright, config at `playwright.config.ts`) run against a real `next build && next start`, on port **3101** — deliberately not 3000, since `reuseExistingServer` will happily attach to *any* server already listening on the configured port, including an unrelated project's dev server, and every assertion then fails against the wrong site with no obvious cause. `pnpm test:e2e` builds locally; CI (`PORT=3101 pnpm start` only) reuses the build the workflow already did.

Everything *except* the AI model call runs against real infrastructure — a real local Supabase stack (auth, RLS, table grants), never mocks. The model call is the one deliberate exception: `MOCK_AI_RESPONSES=1` (set only for Playwright's own spawned server, see `lib/ai/generate.ts`) swaps `generate.ts`'s `callModel()` for a fixed, deterministic recipe. This is a considered tradeoff, not a default reached for out of habit — real Groq/Anthropic calls during Phase 5's own build caught three real bugs (a model removed from Groq's catalog, Groq's strict-JSON-schema `required` quirk, a model writing redundant `"(optional)"` text into an ingredient name) that no mock would have caught, but a live model in CI means non-deterministic assertions and a real API key as a CI secret purely to run tests. The mock recipe deliberately reproduces the exact `"(optional)"` shape from the third bug, so the suite still catches a regression of *that* — it just can't catch a future model/provider-API drift the way this phase's own manual live-browser testing did. Using the actual app (`pnpm dev`, a normal `pnpm start`, or the deployed app) never sets the flag and always calls the real APIs.

### Path alias

`@/*` → `src/*` (see `tsconfig.json`).
