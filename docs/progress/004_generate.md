# 004 - Generate

## Overview
Builds the AI recipe generation pipeline end to end: the `ai`/`@ai-sdk/groq`/
`@ai-sdk/anthropic` layer, a rate-limited Server Action, and the `/generate`
page itself (2a) — textarea, constraint dials, the reassurance chip, and the
generating/error/result states. The first phase to call a real third-party
model API, which surfaced three genuine bugs no amount of typecheck/lint/
unit-test coverage could have caught, all found via live browser testing
against the real Groq API and fixed before landing.

## Status
- **Started**: 2026-08-26
- **Current Step**: Verification
- **Completion**: 100%
- **Expected Completion**: 2026-08-26

## Objectives
- [x] `ANTHROPIC_API_KEY` made optional in `env.server.ts` — it's the Groq-unavailable fallback tier, not a boot requirement, and the app previously refused to start locally without one configured
- [x] `lib/ai/prompt.ts` — preferences as hard constraints, allergies as a distinct safety prohibition, pantry framed as available not required
- [x] `lib/ai/generate.ts` — Groq → one retry (validation failures only) → Anthropic fallback; `generateWithProvider` as the single-attempt path behind "Try a different model"
- [x] `generation_events` table + `lib/ai/rate-limit.ts` — 10 attempts / 10 minutes, fails open on a query error, with the table's grants added in the same migration that creates it
- [x] `/generate` Server Action (`actions.ts`) — rate limit → load preferences/pantry → generate → record the event → pantry-match summary
- [x] `/generate` page + `GenerateForm.tsx` — idle/generating/error/result states, servings stepper, effort/meal segmented controls, "Save to my recipes" and "Something else"
- [x] Three real bugs found via live Groq calls, root-caused, and fixed: a removed default model, Groq's strict-JSON-schema `required` quirk, and a redundant `"(optional)"` written into ingredient names
- [x] `sanitizeRecipe()` defensively strips the redundant `"(optional)"` pattern, backed by 3 dedicated unit tests and an e2e regression test
- [x] e2e coverage for `/generate` via a mocked model call (`MOCK_AI_RESPONSES`), keeping real Groq/Anthropic calls exclusive to actually using the app
- [x] Full verification: typecheck, lint, unit tests (161/161), e2e (15/15), build, `supabase db reset`/`db lint`, type-diff clean

## Implementation Progress

### Step 1: Unblock local dev — optional Anthropic key
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `env.server.ts`: `ANTHROPIC_API_KEY` changed from `z.string().min(1)` to
  `z.string().min(1).optional()`. Same reasoning already applied to
  `SUPABASE_SECRET_KEY` — a key needed only by an optional tier shouldn't
  make the whole app refuse to boot wherever it isn't set, and `.env.local`
  genuinely had no Anthropic key.
- `generate.ts` constructs `anthropicProvider` only when the key is present
  and exports `hasAnthropicFallback` so the Server Action and page can offer
  (or not offer) "Try a different model" honestly.
- `env.server.test.ts` updated: the old "throws when ANTHROPIC_API_KEY is
  missing" test replaced with one asserting the opposite is now true.

#### Current Work
None — step complete.

### Step 2: Prompt, schema wiring, and the AI SDK v7 API
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `lib/ai/prompt.ts` — `buildRecipePrompt()` turns preferences into a hard
  constraint list; allergies get their own line stated as a safety
  requirement ("do not include... under any circumstance"), never mixed in
  with ordinary dislikes; pantry contents are framed as "available, free to
  use if it fits," not something the model is obligated to use. 8 unit
  tests cover constraint presence/absence per preference field.
- `lib/ai/generate.ts` written directly against AI SDK **v7.0.79** — a major
  version beyond training-data knowledge, so the API was read from
  `node_modules/.pnpm/ai@7.0.79.../ai/dist/index.d.ts` rather than assumed.
  `generateObject` carries its own `@deprecated` doc comment pointing at
  `generateText({ output: Output.object({ schema }) })`, which is what's
  used here; the result is read via `result.output`.
- Fallback chain: Groq → one retry, gated to `NoOutputGeneratedError`
  specifically (a schema-invalid or malformed response is often a one-off
  hiccup worth retrying; a transport/auth error retrying the same way can't
  help) → Anthropic, if configured, as the true fallback for the *whole*
  chain regardless of why Groq ultimately failed. `generateWithProvider` is
  the separate, single-attempt path behind the canvas's own "Try a
  different model" control — no retry of its own, since a user asking for
  a specific model gets exactly one attempt at it.
- 10 unit tests (`vi.doMock` per test + dynamic `import()`, since
  `env.server.ts` validates at import time) covering first-try success,
  retry-then-success, fallback-after-two-Groq-failures, no-retry-on-
  transport-error, both-fail, Anthropic-not-configured, and
  `generateWithProvider`'s single-attempt semantics.

#### Current Work
None — step complete.

### Step 3: Rate limiting, the Server Action, and the page
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `supabase/migrations/20260826000100_generation_events.sql` — `id, user_id,
  provider (check: groq/anthropic), succeeded, created_at`, owner-only RLS
  (select+insert), an index, and **`grant select, insert ... to
  authenticated`** in the same migration that creates the table. Phase 4
  found `pantry_items` and every other table missing exactly this grant
  (`supabase/config.toml`'s `auto_expose_new_tables` isn't set, so RLS
  policies alone don't expose a table to PostgREST) — this migration is
  that lesson applied on the first table written since. Verified via
  `supabase db reset`/`db lint` and a direct
  `information_schema.role_table_grants` query.
- `lib/ai/rate-limit.ts` — `checkGenerationRateLimit` (10 attempts / 10
  minute rolling window, fails open on a query error rather than blocking
  every user if the check itself breaks) and `recordGenerationEvent`
  (best-effort — an insert failure here shouldn't fail the user's actual
  generation). 7 unit tests against a hand-built fake Supabase client chain.
- `app/(app)/generate/actions.ts` — `generateRecipeAction` (bound via
  `useActionState`): parses the form with Zod, checks the rate limit, reads
  `user_preferences` and `pantry_items` (status `have`), calls
  `generateRecipe` or `generateWithProvider` depending on an optional
  `provider` field, records the event, and computes the pantry-match
  summary via Phase 3's `summarizePantryMatch`. `saveRecipeAction` re-
  validates the hidden `recipe` JSON field through `recipeContentSchema`
  before inserting — the client is never trusted to have sent back
  unmodified data. `hasAnthropicFallback` is deliberately *not* re-exported
  from this file (a `"use server"` file may only export async functions);
  the page imports it directly from `lib/ai/generate` instead.
- `app/(app)/generate/GenerateForm.tsx` — the textarea, servings stepper,
  effort/meal `Seg` controls, the reassurance chip (built from the user's
  actual diets/allergies), and four states: idle, a `GeneratingSkeleton`,
  an `ErrorState` with "Try again" and a conditional "Try a different
  model," and a `ResultCard` with the pantry-match summary, ingredients,
  steps, "Save to my recipes" (`formAction={saveRecipeAction}` overriding
  the form's default action — the native multi-action-form pattern), and
  "Something else" (resubmits the same form for a fresh attempt).

#### Current Work
None — step complete.

### Step 4: Three real bugs, found by actually calling Groq
**Status**: Completed
**Date Range**: 2026-08-26

None of this step's bugs were hypothetical or code-review findings — all
three were only visible by completing a real signup → onboarding →
`/generate` submission in a real browser against the real Groq API, the
same discipline Phase 4 established for Supabase.

#### Bug 1 — the default model no longer exists
A real submission failed fast (~140-150ms) with a generic "Couldn't reach
the recipe generator." Root-caused by temporarily logging the raw error,
which read `AI_APICallError: The model 'llama-3.3-70b-versatile' does not
exist or you do not have access to it` (404, `model_not_found`). Confirmed
directly against `https://api.groq.com/openai/v1/models` with the real key
— no `llama-3.3-*` model was in the returned catalog at all. Verified two
replacement candidates (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`) via a
standalone script making real calls against this app's own schema; chose
`gpt-oss-120b` for quality over `gpt-oss-20b`'s speed. `GROQ_TEXT_MODEL`'s
default updated in `env.server.ts`, with the finding (not an assumption)
recorded in a comment there and in this project's `CLAUDE.md`.

#### Bug 2 — Groq's strict JSON Schema mode rejects optional fields
After the model fix, a fresh attempt hit a *different* error: `invalid JSON
schema for response_format: ... required is required to be supplied and to
be an array including every key in properties. The following properties
must be listed in required: timer_minutes` (400). Groq's gpt-oss models
inherit the OpenAI-lineage convention that strict structured output must
list *every* property in `required`, including ones the schema marks
`.optional()`/`.default()` — which is most of `recipeContentSchema`.
Restructuring the whole schema to `.nullable()` throughout was considered
and rejected as disproportionate scope for a Groq-specific quirk Anthropic's
own structured-output path doesn't share; `@ai-sdk/groq` exposes exactly
this escape hatch as a provider option, so `callModel()` now passes
`providerOptions: { groq: { strictJsonSchema: false } }` for Groq calls
only, with the tradeoff (losing grammar-constrained decoding for this call;
the existing validation-retry is the safety net) documented in a comment.

#### Bug 3 — the model doubles its own "(optional)" text
With both fixes in place, a full real generation succeeded
("Quick Lime-Sriracha Chicken Fried Rice") — but inspecting the rendered
DOM showed ingredient names like "Soy sauce (optional) (optional)". The
model was writing "(optional)" literally into the `name` field on top of
`optional: true`, which combined with the UI's own conditional
`" (optional)"` suffix for that flag. Fixed two ways: `prompt.ts` gained an
explicit instruction never to write "(optional)" into the name itself, and
`generate.ts` gained a defensive `sanitizeRecipe()` — applied to every
`callModel()` result, real or mocked — that strips a trailing
`(optional)`-shaped pattern via regex, since a prompt-only fix isn't
guaranteed to be followed reliably and the redundant text would otherwise
persist permanently into saved recipes, not just be a one-time display
glitch. 3 unit tests cover stripping the suffix, leaving a clean name
alone, and *not* stripping "optional" when it's genuinely part of a name
("Optional Foods brand stock cube") rather than a trailing marker.

#### Current Work
None — step complete.

### Step 5: e2e coverage, with the model call mocked
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- Asked directly how to handle the AI call in e2e, since it's a real
  tradeoff with no single obviously-correct answer: real Groq calls are
  what caught all three bugs above, but running them in CI means
  non-deterministic assertions and a real API key as a CI secret purely to
  run tests. Decision: **mock the model call for e2e, keep it real for
  actually using the app.**
- `generate.ts` gained `MOCK_AI_RESPONSES` — a raw `process.env` read (not a
  `serverEnv` field; it's a test seam, not real app configuration) that
  makes `callModel()` return a fixed, deterministic recipe instead of
  calling Groq/Anthropic, still routed through `sanitizeRecipe()` so the
  mock exercises that code path too. The mock recipe deliberately bakes in
  a redundant `"(optional)"` on one ingredient, reproducing Bug 3's exact
  shape, so this suite catches a regression of it without spending a real
  API call.
- `playwright.config.ts`'s `webServer.env` sets `MOCK_AI_RESPONSES: "1"` —
  only the server process Playwright itself spawns gets it. `pnpm dev` and
  a normal `pnpm start` never set it, so using the actual app always calls
  the real APIs, exactly as asked.
- `e2e/generate.spec.ts` — 2 new tests: submitting renders the mocked
  recipe with exactly one `"(optional)"` (not doubled) and the correct
  pantry-match count (2 required ingredients, not 3 — the mock's third
  ingredient is optional, and `summarizePantryMatch` excludes optional
  ingredients from that count entirely, which the first draft of this test
  got wrong before checking `pantry-match.ts`); "Save to my recipes"
  persists through a real insert and the title appears back on `/recipes`
  after the redirect — the real RLS/grant path, not a stub.
- Found and fixed a stale assertion while adding this: Phase 4's own
  `auth-onboarding.spec.ts` still expected `/generate` to be the Phase 4
  `ComingSoon` stub's heading ("Tell PantryPal what's in your kitchen"),
  which this phase's real page replaced with "What's in your kitchen
  tonight?" — exactly the kind of regression e2e exists to catch, caught
  before it ever reached a passing CI run. (Also had to switch the
  assertion to a regex — the real heading uses a typographic `’`, not a
  straight apostrophe, from `&rsquo;` in the JSX.)
- `app/(app)/recipes/page.tsx`'s empty state read "Recipe generation
  arrives in a later phase" — literally false as of this phase — reworded
  to point at `/generate`.
- `CLAUDE.md`'s "End-to-end tests" section extended to document the
  mock-for-tests/real-for-the-app split and why, so a future phase doesn't
  have to rediscover this reasoning from the diff alone.

#### Current Work
None — step complete.

#### Next Tasks
None under this step. A live model call is still exercised manually per
phase (as this one was) rather than in CI — worth remembering that a
*future* model/provider-API drift (a Groq/Anthropic catalog change, a new
strict-mode quirk) won't be caught by the e2e suite the way this phase's
three bugs were caught by testing against the real API directly.

## Technical Notes
- AI SDK v7's `generateObject` is deprecated in its own type declarations —
  worth checking `node_modules/.pnpm/ai@<version>.../ai/dist/index.d.ts`
  directly before assuming an API shape from training data on any future
  AI SDK work, the same way this phase had to for the whole `Output.object`
  pattern.
- Groq's model catalog is not stable — `llama-3.3-70b-versatile` was
  removed entirely at some point before this phase. Verify any future
  default-model change against `https://api.groq.com/openai/v1/models`
  directly and with a real `generateText` call against this app's own
  schema, not from memory or documentation.
- `summarizePantryMatch` (Phase 3) excludes `optional: true` ingredients
  from both `requiredCount` and `missing` entirely — worth remembering when
  writing any future test or UI copy that counts "N of M things," since an
  optional ingredient never counts against a recipe being "complete."
- `MOCK_AI_RESPONSES` is intentionally outside `serverEnv`'s Zod schema —
  it's a Playwright-only test seam, not part of the app's real
  configuration contract, and formalizing it there would suggest otherwise
  to a future reader.

## Dependencies
- Builds on Phase 3's `recipeContentSchema`, `summarizePantryMatch`, and UI
  primitives (`Seg`, `Card`, `Tag`, `MealTag`, `PhotoPlaceholder`), and
  Phase 4's `AppShell` (the real `/generate` page replaces its Phase 4
  `ComingSoon` stub outright).
- Blocks Phase 6 — the recipe library/detail/edit/share pages all read
  recipes this phase's `saveRecipeAction` is the first thing to actually
  write.
- `.env.local` still has no `ANTHROPIC_API_KEY` (by choice, per Step 1) —
  Anthropic fallback and "Try a different model" are unexercised in this
  local environment; both are covered by `generate.test.ts`'s mocked unit
  tests instead.

## Risks & Mitigation
- **A future Groq/Anthropic API or catalog change won't be caught by CI**
  — e2e now mocks the model call by design (see Step 5). Mitigated only by
  discipline: verify any future model or provider-library change with a
  real live call, the same way this phase's three bugs were actually found,
  before trusting it in a PR.
- **`sanitizeRecipe()`'s regex is a defensive patch, not a prompt
  guarantee** — a sufficiently different phrasing of "(optional)" from a
  future model could slip through. Low risk (the pattern covers the
  observed real cases plus common bracket/case variants) and cheap to
  extend if a new variant is ever seen in practice.

## Resources
- Plan: `~/.claude/plans/use-the-claude-design-mcp-proud-bonbon.md`
- `docs/progress/003_shell_nav_auth_onboarding.md` — the shell/auth/
  onboarding this phase's `/generate` page renders inside, and the origin
  of the "real backend in e2e, not mocks" discipline this phase extends
  (with one deliberate, documented exception for the model call itself)

## Change Log
- **2026-08-26**: Full AI generation pipeline built — prompt construction,
  the Groq→retry→Anthropic fallback chain on AI SDK v7's `generateText` +
  `Output.object`, per-user rate limiting (`generation_events`, grants
  included in the same migration), the `/generate` Server Action and page.
  Three real bugs found via live Groq calls and fixed: a removed default
  model, Groq's strict-JSON-schema `required` requirement, and a redundant
  `"(optional)"` the model wrote into ingredient names (fixed at both the
  prompt and defensively via `sanitizeRecipe()`). e2e coverage added for
  `/generate` with the model call mocked (`MOCK_AI_RESPONSES`, wired only
  into Playwright's spawned server) — a deliberate choice to keep real API
  calls exclusive to actually using the app, per direct user instruction,
  after weighing that tradeoff against CI determinism and secret
  management. One stale e2e assertion and one now-false empty-state string
  found and fixed as a result of wiring the real page in. Full
  verification: typecheck, lint, 161/161 unit tests, 15/15 e2e, build,
  `supabase db reset`/`db lint`, type-diff clean.
