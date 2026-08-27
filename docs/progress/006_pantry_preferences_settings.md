# 006 - Pantry, Preferences, Settings

## Overview
The final phase of the 7-phase plan: pantry management (add/categorize/
flag-expiring/delete), a full Preferences page (diets, allergies, dislikes,
cuisines, servings, heat, time limit, a "what this changes" summary, and a
real diet-clash detector), and an Account Settings page (email/password,
theme, units, notification preferences, default recipe visibility, a JSON
data export, and account deletion behind a type-DELETE gate). With this
phase merged, the core loop described in the original implementation plan
is complete — everything except This week/meal planning, the Have/Need
shopping list, cook mode, voice input, and photo upload, all deliberately
deferred from the start.

## Status
- **Started**: 2026-08-26
- **Current Step**: Verification
- **Completion**: 100%
- **Expected Completion**: 2026-08-26

## Objectives
- [x] `/pantry` rebuilt: grouped by category, an "use soon" amber flag on near-dated items, a natural-language add box built on Phase 3's `parsePantryEntry()`, upsert-not-insert so re-adding an item never errors, delete, and an empty state
- [x] `/preferences` rebuilt: diets, typed allergies, "would rather not," "leans toward," a servings stepper, a heat control, a time-limit slider with a real "no limit" state, a "what this changes" summary, and a real diet-clash query against saved recipes
- [x] `/preferences/settings` (new route): account email/password, a proper System/Light/Dark theme row, units, two nudge toggles (honestly labeled — no delivery mechanism exists yet), default visibility for new recipes, a JSON data export, and account deletion with a type-DELETE-to-confirm gate
- [x] `default_visibility` actually wired into `saveRecipeAction` — the one place that setting can do anything, since the edit form's own visibility control only ever changes an existing row
- [x] Two shared pieces extracted once a second caller needed them: a `Stepper` UI primitive (Generate + Preferences) and `SPICE_LABELS` (the prompt builder + Preferences' heat control)
- [x] Full verification: typecheck, lint, 184/184 unit tests, 38/38 e2e, build

## Implementation Progress

### Step 1: Pantry
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `lib/pantry/categories.ts` — the four-category list (Fridge/Freezer/
  Cupboard/Fresh) this phase invents, since `pantry_items.category` is
  free text with no enum and nothing before this phase (onboarding's
  quick-add, the edit form) ever set it. An "Uncategorized" bucket holds
  every row with no category or an unrecognized one, rather than hiding
  them. `isUseSoon()` flags a row once its `expires_on` is within 3 days
  (inclusive of already-expired) — a fixed, simple threshold, unit tested
  directly rather than only through the UI.
- `app/(app)/pantry/AddPantryItemForm.tsx` — free text through
  `parsePantryEntry()` (Phase 3), plus an optional category select and
  expiry date. Calls the Server Action directly via `startTransition`
  rather than `useActionState` — see Step 4's bug below for why.
- `app/(app)/pantry/actions.ts` — `addPantryItemAction` **upserts**
  (`onConflict: "user_id,name,status"`), not inserts: `pantry_items` has a
  citext-backed unique `(user_id, name, status)`, and re-adding something
  already in the pantry (a very ordinary action — "got more milk") would
  otherwise fail the whole request on a unique violation. Re-adding
  overwrites quantity/unit/category/expiry with whatever was just typed.
  `deletePantryItemAction` is a plain owner-scoped delete.
- `app/(app)/pantry/page.tsx` — groups rows by category in a fixed order
  (the four canonical categories, then Uncategorized), skips empty groups,
  and shows a "nothing yet" empty state pointing at the add box.

#### Current Work
None — step complete.

### Step 2: Preferences
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `app/(app)/preferences/PreferencesForm.tsx` — diets (`ChipToggle`,
  reused from onboarding) and three `TagInput` fields (allergies, "would
  rather not eat," "leans toward"), a `Stepper` for default servings
  (newly extracted from `GenerateForm.tsx`, which had the identical +/-
  control inline), a `Seg` heat control keyed to `SPICE_LABELS` (moved
  from `prompt.ts` into `lib/ai/recipe-labels.ts` so the prompt builder and
  this UI can never describe the same stored value differently), and a
  time-limit slider with an explicit "No limit" checkbox — `max_total_
  minutes` is genuinely nullable in the schema, and the UI now has a real
  state for that instead of forcing every user to pick some number.
- `app/(app)/preferences/page.tsx` — a "what this changes" card,
  server-rendered from the *currently saved* preferences (matching
  `GenerateForm`'s own reassurance-chip pattern — explanatory copy, not a
  live preview of unsaved edits, since `ChipToggle`/`TagInput` are
  deliberately uncontrolled and wiring a live preview would mean
  converting both to controlled components project-wide for a "nice to
  have"). The diet-clash card runs a real query: recipes whose `diet_tags`
  does **not** contain every element of the current `diets` array
  (PostgREST's `cs`/array-contains operator, negated via `.not()`).
- `app/(app)/preferences/actions.ts` — `savePreferencesAction`, broader
  than onboarding's `saveDietaryPreferences` (which only ever touched
  `diets`/`allergies`) but built the same way: parse every field through
  Zod, update `user_preferences`, redirect back.

#### Current Work
None — step complete.

### Step 3: Account Settings
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `app/(app)/preferences/settings/page.tsx` (new route) — four sections:
  Account, Appearance & sharing, Your data, and the danger zone. Linked
  from Preferences via a small sub-nav (`How you eat` / `Settings`), and
  from the mobile account Sheet, since the five-item primary nav
  (Phase 4) doesn't have room for a sixth destination.
- `AccountForm.tsx` — email and password change via
  `supabase.auth.updateUser()`. Either field can be left blank to update
  only the other one. An email change is reported honestly as pending
  confirmation, not applied immediately (Supabase's own confirmation
  flow). Verified live: changed the password, signed out, and logged back
  in with the new one.
- `SettingsForm.tsx` — Theme is a proper System/Light/Dark `Seg` calling
  `applyTheme`/`storeTheme` (`lib/theme/constants.ts`) directly, applying
  instantly on click exactly like the existing header `ThemeToggle`, not
  gated behind this form's own Save button. The choice is also submitted
  with the rest of the settings and recorded in `user_preferences.theme`,
  but nothing reads that column back to decide what to render — doing so
  would reintroduce the flash-of-wrong-theme the no-flash inline script in
  `layout.tsx` exists to prevent. Units, the two nudge toggles (labeled
  honestly — no delivery mechanism exists yet, matching the migration's
  own comment), and default visibility are plain saved fields.
- `DangerZone.tsx` — the delete button stays disabled until the
  confirmation field's value is exactly `"DELETE"`, client-side, backed by
  the same check server-side in `deleteAccountAction` (never trust the
  client alone). Calls `delete_own_account()` (Phase 3's RPC), then
  `supabase.auth.signOut()` immediately — the RPC deletes the account
  server-side, but the browser would otherwise keep sending the now-
  invalid session cookies until their natural expiry.
- `export/route.ts` — a GET Route Handler, not a Server Action, since the
  point is a normal browser download (`Content-Disposition: attachment`)
  and Server Actions can't hand one back directly. Returns every row the
  account owns: profile, preferences, recipes, pantry items.
- `generate/actions.ts`'s `saveRecipeAction` updated to read
  `default_visibility` and apply it — the one place in the app that
  setting could actually do anything, since the edit form's visibility
  control only ever changes an *existing* row, never sets the initial
  value on a new one. Generates a `share_slug` up front when the default
  isn't `'private'`, mirroring the edit action's own logic.

#### Current Work
None — step complete.

### Step 4: One real bug, found immediately by the project's own lint rule
**Status**: Completed
**Date Range**: 2026-08-26

`AddPantryItemForm`'s first draft used `useActionState` plus a `useEffect`
that cleared the text/date inputs once the action's returned state showed
success — the same "reset a form after an async action" need Duplicate/
Delete/rewrite already had in Phase 6, but solved differently there. ESLint
failed the build immediately: `react-hooks/set-state-in-effect` flagged the
`setText("")`/`setExpiresOn("")` calls inside the effect body as the exact
"cascading render from a synchronous setState in an effect" pattern the
rule exists to catch — this is the second time in this project a form-
reset need has tripped this rule (the first was `ThemeToggle` in Phase 4).
Fixed by dropping `useActionState` for this one form and calling
`addPantryItemAction` directly inside `startTransition`, clearing the
inputs in the same async callback right after a successful result —
exactly the pattern Phase 6's `DeleteRecipeButton`/`rewriteRecipeAction`
already used successfully, just not yet recognized as the project's
standard answer to "reset state after a Server Action" until now.

#### Current Work
None — step complete.

## Technical Notes
- `react-hooks/set-state-in-effect` has now caught the same category of
  mistake twice (`ThemeToggle` in Phase 4, `AddPantryItemForm` here) —
  worth remembering as the standing answer *before* reaching for
  `useActionState` + a reset effect again: call the Server Action directly
  inside `startTransition` and update local state in the same async
  callback, not from an effect reacting to the result.
- Postgres RLS's OR-combined `select` policies (documented in Phase 6 after
  a real cross-user leak on `recipes`) were specifically re-checked against
  every new query this phase touches — `pantry_items` and
  `user_preferences` only ever have a single owner-only policy each (no
  second, broader read policy), so the same class of bug isn't possible on
  either table today. Worth re-checking this specific question again for
  any future table that gains a second, broader read policy.
- `@dnd-kit`'s Seg/Radio-style controls (`.seg-opt input`, `.radio input`)
  are visually zero-size by design (the visible pill is the wrapping
  label) — e2e interactions with them need to click the label's text, not
  `force`-click the input directly; `force: true` on a genuinely 0×0
  element fails with "outside of the viewport," a different (and less
  obvious) failure than the "element is not visible" a merely-hidden
  element produces.

## Dependencies
- Builds on Phase 3's `parsePantryEntry()`, the `user_preferences`/
  `pantry_items` schema (including the Settings-only columns added in
  `20260825000300_preference_settings.sql`, unused by any UI until now),
  and `delete_own_account()`.
- Builds on Phase 4's `lib/theme/constants.ts` and `ThemeToggle` (this
  phase's Settings Theme row is a richer picker over the exact same
  mechanism, not a parallel one) and Phase 6's `generateShareSlug()`.
- Nothing in the deferred second pass (This week, shopping list, cook
  mode) depends on anything built in this phase specifically, though the
  `pantry_items.status`/`low_stock`/`needed_for_recipe_id` columns this
  phase's UI still doesn't touch are exactly what that later shopping-list
  pass will need.

## Risks & Mitigation
- **The four pantry categories are UI-only, not schema-enforced** — a row
  written by some future code path (or directly in the database) with an
  arbitrary `category` string just falls into "Uncategorized" rather than
  erroring. Acceptable for now (matches `category`'s own free-text column
  design), but worth reconsidering if a future pass wants stricter
  guarantees.
- **`user_preferences.theme` is written but never read back** by the app's
  own rendering — a deliberate choice (see Technical Notes) to avoid a
  flash-of-wrong-theme, but it means the column would need real wiring
  (reading it server-side into the no-flash inline script, or accepting a
  brief flash) before it could back genuine cross-device theme sync.

## Resources
- Plan: `~/.claude/plans/use-the-claude-design-mcp-proud-bonbon.md` — the
  original 7-phase plan; this phase closes it out.
- `docs/progress/005_library_detail_edit_share.md` — the RLS OR-policy
  lesson this phase re-checked against, and `generateShareSlug()`'s origin.

## Change Log
- **2026-08-26**: Pantry (categorized, upsert-based add, use-soon flagging,
  delete), Preferences (full dietary/timing controls, a real diet-clash
  query, a "what this changes" summary), and Account Settings (email/
  password, a proper theme row, units, nudge toggles, default recipe
  visibility, JSON export, type-DELETE account deletion) all built.
  `default_visibility` wired into `saveRecipeAction`, the one place it can
  actually take effect. One real bug found via the project's own
  `react-hooks/set-state-in-effect` lint rule (a form-reset effect,
  fixed by moving to the `startTransition`-direct-call pattern Phase 6
  already established) — everything else was verified correct on first
  live pass: pantry add/upsert/delete, preferences save + clash detection,
  theme instant-apply + persistence, default-visibility wiring into a real
  saved recipe, password change (confirmed by logging back in with the new
  one), JSON export, and full account deletion (confirmed the row is
  actually gone from `auth.users` and the session can no longer reach any
  protected page). With this phase merged, the core loop from the original
  7-phase plan is complete. Full verification: typecheck, lint, 184/184
  unit tests, 38/38 e2e, build.
