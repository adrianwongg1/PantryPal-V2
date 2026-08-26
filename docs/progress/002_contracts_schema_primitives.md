# 002 - Contracts, Schema, Primitives

## Overview
The unglamorous phase every later feature phase leans on: the one Zod
contract for recipe content, four schema migrations (cook history + diet
tags, pantry Have/Need, preference settings, self-service account
deletion), the pantry-matching engine, a natural-language quantity/unit
parser, a share-slug generator, and the first set of themed UI primitives
built on Phase 2's Organic component classes. No feature page consumes
these yet — that starts in Phase 4.

## Status
- **Started**: 2026-08-25
- **Current Step**: Verification
- **Completion**: 100%
- **Expected Completion**: 2026-08-25

## Objectives
- [x] `src/lib/ai/schema.ts` — the recipe content Zod contract, field limits mirroring the DB CHECK constraints exactly
- [x] Four new migrations, each followed by `supabase gen types typescript --local`
- [x] `delete_own_account()` verified end-to-end against the local stack, not just read for correctness
- [x] `src/lib/share/slug.ts` — share-slug generator matching the DB check constraint
- [x] `src/lib/recipes/pantry-match.ts` — ingredient/pantry matching engine
- [x] `src/lib/pantry/parse.ts` — natural-language pantry-entry parser
- [x] `src/components/ui/*` — Button, Tag/MealTag, Input/Textarea, Field, Seg, Card (+ sub-parts), Sheet, PhotoPlaceholder, Logo
- [x] `@testing-library/react` + `jest-dom` + `user-event` installed; every primitive has component tests
- [x] Full verification: typecheck, lint, build, unit tests, `supabase db reset`, `supabase db lint`, type-diff clean

## Implementation Progress

### Step 1: The Zod contract
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-25

#### Tasks Completed
- `src/lib/ai/schema.ts` — `mealTypeSchema`, `difficultySchema`,
  `dietTagSchema` (mirrors `public.diet_tag` exactly), `ingredientSchema`
  (`name`, `pantry_key`, `quantity?`, `unit?`, `optional`),
  `stepSchema` (`text`, `timer_minutes?`), and `recipeContentSchema` — the
  content subset every one of the three boundaries CLAUDE.md names (AI
  output, DB row, edit form) validates against. Every length/range limit is
  a direct mirror of the CHECK constraint in
  `supabase/migrations/20260813000300_recipes.sql`, commented at the point
  of mirroring so the two can't silently drift without the comment being
  visibly wrong.
- Documented, not silently worked around: the `recipes.ingredients` /
  `recipes.steps` columns default to `'[]'::jsonb`, which itself fails
  their own `jsonb_array_length between 1 and 60/40` CHECK — the default is
  effectively dead, and every insert must supply a real array. Harmless
  (generation always produces >=1 ingredient, and this schema's own
  `min(1)` guarantees it), but worth knowing before debugging an insert
  that "should" have worked via the default.
- 22 unit tests covering every boundary: min/max lengths, defaults, enum
  rejection, empty-array rejection, over-length arrays.

#### Current Work
None — step complete.

#### Next Tasks
`recipeContentSchema` becomes the `generateObject` target in Phase 5 and
the `zodResolver` schema for the edit form in Phase 6 — no changes
anticipated to the schema itself at that point, just consumers.

### Step 2: Migrations
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-25

#### Tasks Completed
- `20260825000100_recipe_history_and_diet_tags.sql` — `recipes.diet_tags`
  (`public.diet_tag[]`, GIN-indexed), `cooked_count`, `last_cooked_at`,
  `notes`.
- `20260825000200_pantry_status.sql` — new `public.pantry_status` enum
  (`have`/`need`), `pantry_items.status`/`low_stock`/
  `needed_for_recipe_id`. Widened the unique constraint from
  `(user_id, name)` to `(user_id, name, status)` — done now, while the
  table is empty, specifically because narrowing/widening a unique
  constraint against live rows later would be a far more painful
  migration. Verified directly against the local stack (see Step 4): the
  same name can now exist once per status, a true duplicate within one
  status is still rejected.
- `20260825000300_preference_settings.sql` — new `public.units_system`
  and `public.theme_preference` enums, `user_preferences.units`/`theme`/
  `notify_expiring`/`notify_weekly_plan`/`default_visibility`. Migration
  comment is explicit that the two `notify_*` columns are storage only —
  no delivery mechanism exists yet, so whichever phase builds the Settings
  UI reading them must say so, not imply the nudges fire.
- `20260825000400_delete_own_account.sql` — `security definer`,
  `set search_path = ''`, operates only on `(select auth.uid())` with no
  id parameter (so there is nothing for a caller to point at another
  user's account), `revoke all ... from public` +
  `grant execute ... to authenticated` only (not `anon`). Same review-
  worthy header comment discipline as `get_shared_recipe`. Documents one
  known gap rather than silently ignoring it: `recipe-images` storage
  objects aren't FK'd to `recipes` and won't be cleaned up by the cascade
  — harmless today since photo upload isn't built yet, worth remembering
  once it is.
- All four applied cleanly via `supabase db reset` (full rebuild from
  every migration in the directory), `supabase db lint` clean, types
  regenerated and diffed clean against what's committed.

#### Current Work
None — step complete.

#### Next Tasks
None under this step.

### Step 3: Verifying delete_own_account and the pantry status constraint against a live database
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-25

#### Tasks Completed
Read-review isn't enough for a `security definer` function that deletes an
account — ran it against the local stack directly (`docker exec` into the
Supabase Postgres container, since no `psql` client is installed on the
host):

- Inserted a real `auth.users` row, confirmed `handle_new_user`'s trigger
  created the `profiles` + `user_preferences` rows, then added a `recipes`
  row and a `pantry_items` row owned by that user.
- Simulated an authenticated request (`set local role authenticated` +
  `set_config('request.jwt.claim.sub', ...)`, matching `auth.uid()`'s own
  definition) and called `delete_own_account()`: verified all five rows
  (`auth.users`, `profiles`, `user_preferences`, `recipes`,
  `pantry_items`) were gone afterward — the cascade chain through
  `profiles(id) on delete cascade` works as documented, not just as
  written.
- Verified both defensive paths: calling with no JWT claim set (`auth.uid()`
  null) raises `delete_own_account: no authenticated user`; calling as the
  `anon` role is rejected at the grant level (`permission denied for
  function delete_own_account`) before the function body ever runs.
- Verified the pantry unique-constraint change directly: the same item
  name can exist once under `status='have'` and once under `status='need'`
  simultaneously; inserting a second row with the same `(user_id, name,
  status)` still fails as expected.
- All verification ran inside an explicit transaction that was never
  committed (or, on the constraint test, closed without committing) —
  confirmed zero residual rows afterward.

#### Current Work
None — step complete.

#### Next Tasks
None under this step.

### Step 4: Matching, parsing, and share-slug generation
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-25

#### Tasks Completed
- `src/lib/share/slug.ts` — `generateShareSlug()` (20 lowercase hex chars
  from `crypto.randomUUID()`, global in Node and Edge runtimes, no import
  needed) and `isValidShareSlug()`, matching
  `recipes.share_slug`'s `^[a-z0-9-]{8,120}$` check exactly. This is what
  makes sharing possible at all — nothing previously generated a slug, so
  the `share_slug_required_when_shared` constraint made turning visibility
  off `private` impossible.
- `src/lib/recipes/pantry-match.ts` — normalizes and folds common English
  plurals (with a documented, deliberately narrow gap: irregular plurals
  like "leaves" aren't handled beyond what the regular-case rules happen
  to catch), strips accents/punctuation, and maps a small hand-picked
  alias table (coriander/cilantro, spring onion/scallion, etc.). **Found
  and fixed a real design flaw while writing the tests, not after**: the
  first implementation matched via exact string equality between a
  recipe's `pantry_key` and a normalized pantry item name — which
  reproduces the exact failure the module's own top comment names
  ("Cooked chicken, shredded" vs "Rotisserie chicken" never being equal as
  strings), just moved one level down. Replaced with whole-word-phrase
  containment checked in both directions (`chicken` found as a whole word
  inside `rotisserie chicken`, and vice versa for the reverse case),
  verified it does NOT produce the classic false positive a raw substring
  test would ("egg" not matching inside "eggplant"), and documented the
  tradeoff explicitly (occasional false positive on an implausible pantry
  name, far fewer false negatives against how people actually type pantry
  items).
- `src/lib/pantry/parse.ts` — parses "2 limes", "half a bag of rice", "a
  handful of coriander", "400g rice", "3 tbsp sriracha", "1/2 cup rice",
  "½ cup rice" into `{quantity, unit, name}`. A small hand-written parser,
  not an AI call, since this has to run on every keystroke / every
  ingredient row.
- 44 unit tests across the three modules, including the design canvas's
  own worked examples by name (7a's "5 of 7 in your pantry", 1c/7a's "two
  short").

#### Current Work
None — step complete.

#### Next Tasks
The alias table and plural-fold rules grow only when a real mismatch is
observed in actual use, per the module's own comment — not speculatively
ahead of that.

### Step 5: UI primitives
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-25

#### Tasks Completed
- Installed `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`; registered jest-dom matchers in
  `src/test/setup.ts`.
- Found and worked around a real test-infra gap: jsdom 30.x (as pinned)
  does not implement `HTMLDialogElement.showModal`/`close` at all (not
  even a stub — the methods are simply `undefined`), which would make
  `Sheet` untestable. Added a documented polyfill in `src/test/setup.ts`
  (toggles the `open` attribute, which jsdom's IDL reflection already
  handles correctly on its own; fires the `close` event) — scoped to test
  setup only, real target browsers need no such thing.
- `src/components/ui/Logo.tsx` — the "bowl & sprout" mark (canvas 4b),
  confirmed as canonical because every shell artboard across turns 1, 2,
  5, 6, and 7 already draws this exact SVG despite turn 4 presenting four
  candidates. Colors are token-driven via inline `style` (not hardcoded
  hex) rather than SVG presentation attributes, so `var(--color-accent)`
  etc. resolve reliably rather than depending on browser-specific
  presentation-attribute CSS-value support.
- `Button.tsx` (+ exported `buttonClassName()` for non-`<button>`
  elements like the design's own `<a class="btn ...">` links),
  `Tag.tsx`/`MealTag`, `Input.tsx`/`Textarea`, `Field.tsx`, `Card.tsx` (+
  `CardKicker`/`CardTitle`/`CardBody`/`CardMeta`), `PhotoPlaceholder.tsx`
  — all left without `"use client"`, since none call hooks or touch
  browser-only APIs; they're usable from both Server and Client
  Components, and the boundary is decided by whoever renders them.
- `Seg.tsx` — a segmented control on real `<input type="radio">`
  elements, replacing the bare `<span>` tabs the canvas draws throughout
  (e.g. 7c's Effort control). Verified keyboard operability isn't just
  assumed: a test drives it with `{ArrowRight}` via `user-event` and
  confirms the selection actually moves — this is genuine native
  radio-group browser behavior, and it was worth confirming
  Testing Library's jsdom environment actually simulates it before
  trusting the test.
- `Sheet.tsx` — built on native `<dialog>` (`showModal()`/`close()`) per
  the plan, rather than a portal + hand-rolled focus trap. One
  implementation meant for every bottom-sheet/modal surface (5c/6b/7b's
  deferred drawers, and confirm dialogs in core-loop phases). Backdrop-
  click-to-close uses the standard `event.target === dialogRef.current`
  pattern (a `<dialog>`'s own click target for its backdrop area, since
  `::backdrop` isn't a real DOM node).
- `PhotoPlaceholder.tsx` — the "designed placeholder" decided earlier in
  this project: a deterministic pattern (three soft circles, positioned
  and sized from a hash of the recipe id, tinted with that recipe's
  meal-type pair) rather than a plain grey box, so a card doesn't visibly
  change between renders and an empty photo slot reads as intentional.
- 44 component tests across all nine primitives.

#### Current Work
None — step complete.

#### Next Tasks
None of these primitives are wired into a real page yet — that's Phase 4
onward. No e2e coverage was added in this phase for exactly that reason:
there is no route yet for an end-to-end test to exercise. Each later phase
that wires a primitive into a real screen adds e2e coverage for that
screen at that point, per the project's testing approach going forward.

## Technical Notes
- `eslint.config.mjs` — added `supabase/.temp/**` and `supabase/.branches/**`
  to `globalIgnores`. Found by running `pnpm lint` locally after
  `supabase start`/`db reset`: the CLI writes a generated (minified) edge-
  runtime bundle into `supabase/.temp/`, gitignored but not excluded from
  ESLint's own scan, so `pnpm lint` failed on ~150 rule violations in a
  file nobody wrote. CI never hits this (its `lint` step runs before
  `supabase start`), but any local dev running the two in the other order
  would.
- The `security definer` verification in Step 3 used
  `set_config('request.jwt.claim.sub', ..., true)` inside a transaction —
  this is exactly what `auth.uid()` itself reads (confirmed by reading its
  definition: `coalesce(current_setting('request.jwt.claim.sub', true),
  (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))::uuid`),
  so the test exercises the real code path, not a mock of it.
- No `psql` client is installed on the host; DB verification in this phase
  went through `docker exec -i supabase_db_PantryPal_v2 psql ...` against
  the container Supabase's CLI already starts.
- `foldTrailingPlural` in `pantry-match.ts` operates on the whole
  normalized string, not word-by-word — for single-word keys (the common
  case) this is equivalent to per-word folding; for multi-word phrases it
  only folds the final word, which is what every test case in this phase
  actually needs, but is worth knowing before assuming it's a general
  per-word stemmer.

## Dependencies
- Builds directly on Phase 2 (Organic component classes in
  `globals.css`) — every UI primitive in this phase renders through those
  classes.
- Blocks Phase 4 onward: the app shell, auth pages, and every feature
  screen consume these primitives, the schema, and the matching/parsing
  utilities.
- New devDependencies: `@testing-library/react`, `@testing-library/jest-
  dom`, `@testing-library/user-event`.

## Risks & Mitigation
- **Matching false positives** (e.g. an ingredient "lime" matching an
  implausible pantry item like "key lime pie") — accepted and documented
  as the right side of a tradeoff for a "you have this" hint rather than a
  safety-critical check; not something to over-engineer against
  speculatively.
- **Plural-fold / alias-table coverage gaps** — deliberately grown only
  from observed real mismatches, per the module's own comment, not
  guessed at ahead of time.

## Resources
- Plan: `~/.claude/plans/use-the-claude-design-mcp-proud-bonbon.md`
- `docs/progress/001_design_system_port.md` — the component classes these
  primitives are built on

## Change Log
- **2026-08-25**: Zod contract, four migrations (verified end-to-end
  against a live local stack, including the security-sensitive
  `delete_own_account` RPC), share-slug generator, pantry-matching engine
  (with a real design flaw caught and fixed during test-writing), NL
  pantry-entry parser, and nine tested UI primitives, all landed together.
