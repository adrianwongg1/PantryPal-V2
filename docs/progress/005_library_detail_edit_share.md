# 005 - Library, Detail, Edit, Share

## Overview
Builds the rest of the core recipe loop: a real library grid with search/
filter/sort, a full recipe detail page, the hardest surface in the app (the
edit form — React Hook Form + `useFieldArray` + `@dnd-kit` reordering + a
second AI call for "Ask for a rewrite" + visibility/share-link management),
and the public `/r/[slug]` share page. Delete, Duplicate, and Print round
out the detail page's own controls. The largest phase so far, and the one
that found the most real bugs via live testing — including a genuine
cross-user data-scoping bug in the library and detail pages, found and
fixed before it ever reached a review.

## Status
- **Started**: 2026-08-26
- **Current Step**: Verification
- **Completion**: 100%
- **Expected Completion**: 2026-08-26

## Objectives
- [x] `/recipes` rebuilt: search, meal filter chips, sort (Recent/A–Z/Quickest), card grid, and distinct empty states for "no recipes yet" vs. "no recipes match"
- [x] `/recipes/[id]` detail page: next actions, pantry-matched ingredients with ticks, the "N short" card, method with timer badges, sharing info, Duplicate/Print/Delete
- [x] `/recipes/[id]/edit`: full content form, ingredient/step arrays with quick-add and keyboard-accessible drag reorder, diet tags, tags, visibility with share-link generation, a sticky save bar naming what changed
- [x] "Ask for a rewrite" — a second AI call (`rewriteRecipe`) reusing the Groq→retry→Anthropic chain, wired into the edit form as preset chips plus a free-text instruction
- [x] `/r/[slug]` public share page + `opengraph-image.tsx`, reading exclusively through `get_shared_recipe()`
- [x] A real cross-user data-scoping bug found live, root-caused, and fixed across every owner-scoped query on `recipes`
- [x] Two real interaction bugs in the edit form found live and fixed: `isDirty` falsely true on load, and keyboard drag-reorder silently doing nothing
- [x] Mobile-responsive fixes for the edit form's ingredient/step rows and the meal-type selector, found live at 375px
- [x] Full verification: typecheck, lint, 176/176 unit tests, 29/29 e2e, build

## Implementation Progress

### Step 1: Library, detail page, and the read-only surfaces
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `app/(app)/recipes/page.tsx` rebuilt from the Phase 1 placeholder: a
  zero-JS search form (`method="GET"`), meal-filter chips and sort links
  as plain `<Link>`s (toggling query params), and a card grid using the
  same `PhotoPlaceholder`/`MealTag` primitives Generate's result card
  already established. Two distinct empty states — "no recipes yet" (with
  a CTA into Generate) vs. "no recipes match" (with a clear-filters link)
  — gated on a separate unfiltered count query, not just the filtered
  result being empty.
- `app/(app)/recipes/[id]/page.tsx` — full detail page: three next actions
  (Edit real; Cook this now disabled, cook mode is a later phase; Add to a
  day linking to the `/week` stub), hero with meal/diet tags and the
  pantry-match summary tag, stat line, the "you're N short" card reusing
  Phase 3's `summarizePantryMatch`, a per-ingredient pantry tick via
  `matchIngredientsToPantry`, an "Uses up" line listing which pantry items
  the recipe would consume, method with `timer_minutes` badges, a sharing
  card when the recipe isn't private, and Duplicate/Print/Delete.
- `DeleteRecipeButton.tsx` (Sheet-based confirm, matching the account
  sheet's own `<dialog>` pattern from Phase 4) and `PrintButton.tsx`
  (`window.print()`) as small client components; Duplicate stays a plain
  zero-JS `<form action={duplicateRecipeAction.bind(null, id)}>`.
- `app/r/[slug]/page.tsx` — public, outside the `(app)` shell entirely, no
  auth. Reads only through `get_shared_recipe(slug)` (the Phase 3
  `security definer` RPC), never a direct table query, matching that
  migration's own stated reason: a table policy covering `unlisted` would
  let PostgREST enumerate every secret link. `generateMetadata` pulls the
  page `<title>` from the same RPC call.
- `app/r/[slug]/opengraph-image.tsx` — referenced but never written since
  the original plan; built on `next/og`'s `ImageResponse` (same engine as
  `icon.tsx`), with the light-mode meal-tint hex values inlined (Satori has
  no stylesheet cascade, same constraint `icon.tsx`'s own comment already
  documents).
- `lib/ai/recipe-labels.ts` — `MEAL_LABELS`/`DIFFICULTY_LABELS` pulled out
  of `GenerateForm.tsx` once library, detail, and the share page all needed
  the same two maps.
- `src/components/ui/Radio.tsx` — a `RadioGroup` primitive on real radio
  inputs styled via globals.css's existing `.radio`/`.dot` rules, same
  reasoning as `Seg`: the canvas draws visibility as an inert `<span>`
  picker; a native input underneath gets keyboard nav for free. Backs the
  edit form's visibility control.

#### Current Work
None — step complete.

### Step 2: A real cross-user data-scoping bug
**Status**: Completed
**Date Range**: 2026-08-26

None of this step was hypothetical — found live, mid-way through manually
verifying the just-built library page in a second browser session.

#### The bug
A brand-new test account, with zero recipes of its own, opened `/recipes`
and saw another real account's recipe sitting in "Your recipes" —
confirmed by decoding the session JWT (genuinely the new user) and
directly querying Postgres (the recipe genuinely belonged to someone
else). Root cause: `recipes` has **two** separate `select` RLS policies —
`"recipes: owner select"` (`user_id = auth.uid()`) and `"recipes: anyone
can read fully-public recipes"` (`visibility = 'public'`) — and Postgres
RLS policies are OR'd together, not ANDed. A query that relies on RLS
alone to mean "my recipes" also legitimately returns *every other user's
public recipe*, because that policy grants that access independently and
correctly. The one recipe that had been made public during this phase's
own manual testing was exactly enough to make this visible.

#### The fix
Every "my recipes" query needed an **explicit** `.eq("user_id", user.id)`
— RLS is the backstop, not the query's own scoping logic. Fixed in:
- `recipes/page.tsx` — both the main list query and the separate
  unfiltered count query used for the two empty states.
- `recipes/[id]/page.tsx` — without this, a non-owner could open another
  user's *public* recipe's detail page and see the Edit/Duplicate/Delete
  controls meant for the owner (the actual mutations would still fail at
  RLS's owner-only update/delete policies, but the page itself shouldn't
  have rendered that way — a non-owner now gets a 404, identical to a
  typo'd id, never a 403 that would confirm the id belongs to *someone*).
- `recipes/[id]/actions.ts`'s `duplicateRecipeAction` — its fetch of the
  source recipe had the same gap.
- (`edit/page.tsx`, `edit/actions.ts`'s update, and `actions.ts`'s delete
  already had this filter from how they were first written — only the
  three above were missing it.)

A dedicated regression test (`e2e/recipes.spec.ts`, "cross-user recipe
scoping") makes a real second account, confirms it does *not* see the
first account's public recipe in its library, confirms the detail URL
404s for it, and confirms the *same* recipe still resolves correctly
through its own `/r/[slug]` link — proving the fix didn't also break
legitimate public sharing.

#### Current Work
None — step complete.

### Step 3: The edit form
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- Added `react-hook-form`, `@hookform/resolvers`, `@dnd-kit/core`,
  `@dnd-kit/sortable`, `@dnd-kit/utilities` — none of this project's
  dependencies until now.
- `lib/recipes/edit-schema.ts` — `editRecipeSchema` extends
  `recipeContentSchema` with `visibility`, kept as its own schema rather
  than growing the content contract itself: `recipeContentSchema`
  validates model output and a DB row's content columns, neither of which
  ever carries visibility.
- `EditForm.tsx` — `useForm(editRecipeSchema)` with `useFieldArray` for
  ingredients and steps. A quick-add box reuses Phase 3's
  `parsePantryEntry()` and `normalizePantryKey()` (tying together two
  utilities that had sat mostly unused since Phase 3) so typing "2 limes"
  appends a fully-formed row. `pantry_key` is deliberately never a
  user-facing field — it's auto-derived from `name` on blur via
  `normalizePantryKey`, since exposing it separately would duplicate what
  the name field already says for no real benefit.
- Ingredient/step rows are `@dnd-kit` sortables with a dedicated drag
  handle, reorderable by pointer or keyboard.
- "Ask for a rewrite" — `rewriteRecipeAction` (a plain exported async
  function, called directly from the client rather than through a
  `<form>`, since it needs the *current in-form* values, not the saved
  row) sends the form's live content plus an instruction to
  `rewriteRecipe()` (new in `lib/ai/generate.ts`), which shares the exact
  Groq→retry→Anthropic fallback chain `generateRecipe` already had — both
  now go through a `withFallback()` helper extracted from what was
  previously duplicated inline in `generateRecipe`. `buildRewritePrompt()`
  (new in `prompt.ts`) asks for the complete recipe back, not a diff, and
  asks the model to keep `pantry_key` stable for unchanged ingredients.
  The result replaces the form's fields (`ingredientsArray.replace()` /
  `stepsArray.replace()` for the arrays, `setValue()` for scalars) and
  requires an explicit Save — a rewrite is a proposal, not an autosave.
- `updateRecipeAction` — re-validates through `editRecipeSchema` (never
  trusts the client's own `zodResolver` pass), generates a `share_slug`
  the first time a recipe leaves `private` and keeps it stable after
  (switching back to private and re-sharing later reuses the same link,
  per the plan's own stated rule), and redirects to the detail page.

#### Bugs found live, root-caused, and fixed
- **The sticky save bar showed "Unsaved changes" on a freshly-loaded,
  untouched form.** Logged `formState.isDirty`, `dirtyFields`, and
  `getValues()` against `defaultValues` side by side: the two value
  objects were genuinely identical (confirmed via `JSON.stringify`
  equality) and `dirtyFields` was genuinely `{}`, yet `isDirty` was
  `true` — a known react-hook-form/`useFieldArray` interaction, not a bug
  in this app's own logic. Fixed by deriving `hasChanges` from
  `Object.keys(dirtyFields).length > 0` instead of trusting `isDirty`
  directly; `dirtyFields` doesn't have this problem and correctly starts
  empty. A dedicated e2e test guards against this regressing.
- **Keyboard drag-reorder did nothing at all** — Space/ArrowDown/Space
  produced no error and no reorder. Traced into `@dnd-kit/core`'s own
  source: its keyboard activator checks `event.target ===
  active.activatorNode.current`, and `activatorNode` is set by a *third*
  ref from `useSortable()` — `setActivatorNodeRef` — that's required
  whenever the drag handle is a different element than the sortable node
  itself (this form's handle is a dedicated button, not the whole row).
  That ref was never wired up. Fixed by making `DragHandle` a
  `forwardRef` component and attaching `setActivatorNodeRef` to it in
  both `SortableIngredientRow` and `SortableStepRow`. Confirmed via a
  Playwright e2e test driving real keyboard events (small waits between
  Space/ArrowDown/Space were also needed — dnd-kit measures the drag
  target's rect asynchronously after pickup, and firing the moves before
  that settles is a no-op).
- **The ingredient/step rows and the 5-option meal selector overflowed
  horizontally on a 375px viewport** — found via `resize_window`'s mobile
  preset, not assumed. Fixed with `flex-wrap` + explicit `order-N` on each
  row's fields (full-width name/step text on its own line, everything
  else wrapping below) and `overflow-x-auto` scoped to just the meal
  selector's own container, rather than reworking the shared `.seg` CSS
  class other screens already depend on.
- **A real React "two children with the same key" warning** on three
  separate ingredient lists (Generate's result card, the detail page, and
  the share page) — all three used `ingredient.pantry_key` as the React
  key, but `pantry_key` is a *matching* key, not a unique id: two
  ingredients can legitimately share one (a recipe with both "1 lime" and
  a separately quick-added "3 limes" — `normalizePantryKey` correctly
  folds the plural to the same key). Switched all three to the array
  index, the correct choice for these non-reorderable, purely-display
  lists (the *edit* form's own lists are fine as-is — `useFieldArray`
  already keys them by its own stable per-row id, never `pantry_key`).

#### Current Work
None — step complete.

### Step 4: A latent CI ordering bug, found while adding the first dynamic routes
**Status**: Completed
**Date Range**: 2026-08-26

This phase added this project's first dynamic route segments
(`/recipes/[id]`, `/recipes/[id]/edit`, `/r/[slug]`) and its first use of
the `PageProps<'...'>` helper type on anything other than the root layout.
`pnpm typecheck` failed locally with `Cannot find name 'PageProps'` —
traced to `next-env.d.ts` and `.next/types/*.d.ts` (both gitignored,
normally written as a side effect of `next dev`/`next build`) simply not
existing yet at that point in a fresh checkout.

Checked whether this was actually reachable in real CI, not just assumed:
cloned this repo fresh into `/tmp` at the last-pushed commit and ran
`pnpm install --frozen-lockfile && pnpm typecheck` exactly as
`.github/workflows/ci.yml` does — it failed identically, on
`LayoutProps<"/">` in `src/app/layout.tsx`, a file that's existed since
Phase 4. Checked `gh run list` for this repo: **the CI workflow has only
ever run 3 times, all on 2026-08-13, before Phase 2 began** — no phase
branch has ever actually triggered it. This ordering bug has been latent
since Phase 4 and simply never had a chance to fail loudly.

Fixed by adding a `next typegen` step (the official, build-free command
for exactly this) right after `Install dependencies` and before
`Typecheck` in `ci.yml`. Re-verified against the same fresh `/tmp` clone:
`next typegen && pnpm typecheck` passes clean.

#### Current Work
None — step complete.

## Technical Notes
- Postgres RLS policies on the same table for the same command are
  **OR'd together**, not ANDed — a permissive design, by default. Any
  future table that mixes an owner-only policy with a broader
  anyone-can-read-under-some-condition policy needs the same discipline
  this step applied: the *app's own query* must still filter to "mine"
  explicitly wherever that's what a screen means, never relying on RLS
  alone to express anything narrower than "everything I'm allowed to
  read."
- `@dnd-kit`'s `useSortable()` returns `setActivatorNodeRef` specifically
  for the drag-handle pattern (handle ≠ sortable node) — skipping it is a
  silent no-op, not an error, which is exactly why it went unnoticed until
  a live keyboard test.
- This repo's CI workflow has effectively never run against a phase
  branch — worth periodically checking `gh run list` against what's
  actually been pushed, since a workflow file can silently drift out of
  sync with reality (as this phase's `next typegen` gap shows) with
  nothing ever failing to signal it.
- `react-hook-form`'s `isDirty` cannot be trusted at face value on a form
  using `useFieldArray` — prefer `Object.keys(formState.dirtyFields).length`
  for "has anything actually changed" anywhere this pattern is reused
  (the future Preferences/Settings forms in Phase 7 are candidates).

## Dependencies
- Builds on Phase 3's schema/primitives (`recipeContentSchema`,
  `pantry-match.ts`, `parse.ts`, `share/slug.ts` — the last of these had
  no caller until this phase) and Phase 5's `lib/ai/generate.ts`, which
  this phase extends rather than duplicates.
- Nothing in this phase is a prerequisite for Phase 7 (Pantry,
  Preferences, Settings), though the `RadioGroup` primitive and the
  `dirtyFields`-over-`isDirty` lesson are both directly reusable there.

## Risks & Mitigation
- **RLS's OR-combined policies are an easy trap to fall into again** on
  any future table that mixes owner-only and public-read access. Mitigated
  by the comment now left on every affected query pointing back to this
  exact bug, and by the regression test — but worth remembering as a
  standing review question ("does this query rely on RLS to mean *only
  mine*, when RLS actually allows more than that?") for any new
  owner-scoped screen.
- **The CI workflow still hasn't actually run in GitHub Actions for any
  phase branch** — the `next typegen` fix is verified against a real fresh
  clone locally, but not yet against the real CI environment itself.
  Worth confirming on the next push/PR rather than assuming parity.

## Resources
- Plan: `~/.claude/plans/use-the-claude-design-mcp-proud-bonbon.md`
- `docs/progress/004_generate.md` — the `lib/ai/generate.ts` fallback
  chain this phase extends with `rewriteRecipe()`, and the
  `MOCK_AI_RESPONSES` mechanism this phase's e2e suite reuses as-is

## Change Log
- **2026-08-26**: Recipe library (search/filter/sort/empty states), full
  detail page (pantry match, sharing, Duplicate/Print/Delete), the edit
  form (React Hook Form + `useFieldArray` + `@dnd-kit` reorder + quick-add
  + "Ask for a rewrite" + visibility/share-link management), and the
  public `/r/[slug]` share page + `opengraph-image.tsx` all built. A real
  cross-user data-scoping bug found live (RLS's OR-combined select
  policies let another user's public recipe appear in a fresh account's
  own library) and fixed with explicit owner filters across every
  affected query, plus a dedicated regression test. Two further live-found
  bugs fixed in the edit form (`isDirty` falsely true on load;
  `@dnd-kit` keyboard reorder silently doing nothing without
  `setActivatorNodeRef`), a React duplicate-key warning fixed across three
  ingredient lists, and mobile-responsive fixes for the edit form found at
  375px. A latent CI ordering bug (typecheck running before any
  `next dev`/`build` had ever written `next-env.d.ts`/`.next/types`,
  latent since Phase 4 and never triggered since CI has never run against
  a phase branch) found and fixed with a `next typegen` step. Full
  verification: typecheck, lint, 176/176 unit tests, 29/29 e2e, build.
