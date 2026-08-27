# 003 - Shell, Navigation, Auth, Onboarding

## Overview
Rebuilds the app shell (responsive sidebar/bottom-bar navigation), the
landing page, both auth pages (desktop split + mobile, magic link added),
and a new two-step onboarding wizard, all on Phase 2/3's tokens and
primitives. Also the first phase to actually run the app end-to-end against
a real database in a real browser — which surfaced three genuine,
previously-undetected bugs (two in code this session didn't touch, one in
CSS this session wrote), all found and fixed before landing.

## Status
- **Started**: 2026-08-25
- **Current Step**: Verification
- **Completion**: 100%
- **Expected Completion**: 2026-08-26

## Objectives
- [x] AppShell rebuilt: full desktop sidebar, icon-only tablet rail, mobile bottom tab bar + account sheet
- [x] `/` landing page (real, replacing the Phase 2 placeholder) with redirect-when-authenticated
- [x] Login rebuilt (3a desktop split / 3c mobile), magic link added, enumeration-safe
- [x] Signup rebuilt (3b), routes fresh signups into onboarding instead of straight to `/recipes`
- [x] Two-step onboarding wizard (`How you eat` → `Stock the pantry`), both steps skippable
- [x] Theme toggle infrastructure (`useSyncExternalStore`, no-flash inline script), surfaced in the shell
- [x] `icon.tsx` (dynamic favicon via the real Logo mark), stale placeholder `favicon.ico` removed
- [x] Four "coming soon" stub pages so every nav destination is real and clickable, not a dead link
- [x] Two new UI primitives (`ChipToggle`, `TagInput`) that Phase 7's Preferences page will reuse verbatim
- [x] First real end-to-end verification in an actual browser against a real database — found and fixed three genuine bugs no earlier check caught
- [x] CI restructured so `pnpm test:e2e` runs against a real, freshly-migrated local Supabase stack, not a placeholder
- [x] Full verification: typecheck, lint, unit tests (133/133), e2e (13/13), build, `supabase db reset`/`db lint`, type-diff clean

## Implementation Progress

### Step 1: Groundwork — Logo/icon, theme mechanism, shared icon set
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-26

#### Tasks Completed
- `Logo.tsx` gained an optional `colors` override — Satori (the engine
  behind `next/og`'s `ImageResponse`, used by `icon.tsx`) has no
  stylesheet cascade and cannot resolve `var(--color-accent)`; everywhere
  else keeps the token-driven default so the mark stays theme-correct.
- `src/app/icon.tsx` — a dynamic favicon rendering the real "bowl &
  sprout" mark instead of Next's default placeholder, which was deleted
  (`src/app/favicon.ico`).
- `src/lib/theme/constants.ts` — `applyTheme`/`readStoredTheme`/
  `storeTheme`, plus `subscribeToThemeChanges` and a raw
  `THEME_INIT_SCRIPT` string inlined into `layout.tsx`'s `<head>` so a
  stored light/dark override applies before first paint.
- `ThemeToggle.tsx` — initially written as `useState` + a mount-time
  `useEffect` reading `localStorage`; the project's lint config flagged
  this immediately (`react-hooks/set-state-in-effect`) as the exact
  "read on mount" pattern `useSyncExternalStore` exists to replace.
  Rewrote on that hook instead. Doing so surfaced a real browser quirk
  worth knowing: the native `storage` event only fires in *other*
  tabs/windows than the one that wrote the value, never the writing tab
  itself — `storeTheme` now also dispatches a synthetic
  `pantrypal-theme-change` event so a same-tab click re-renders correctly.
- `src/components/ui/icons.tsx` — nav/chrome icons at Organic's own spec
  (stroke-width 2.75, round caps), paths taken from the design canvas's
  own markup.
- 13 new unit tests (`constants.test.ts`, `ThemeToggle.test.tsx`).

#### Current Work
None — step complete.

#### Next Tasks
6c's full Theme row (Phase 7) calls `applyTheme`/`storeTheme` directly
rather than duplicating ThemeToggle's cycle-through-three-values UI.

### Step 2: AppShell, landing page, stub pages
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `AppShell.tsx` — full rebuild. Desktop (`lg+`): the turn-7 five-item
  sidebar (Generate/My recipes/This week/Pantry/Preferences) with labels,
  active-state highlighting via `usePathname()`, user footer (avatar,
  email, theme toggle, sign-out). Tablet (`md`–`lg`): the same five items
  as an icon-only rail. Mobile (`<md`): a slim brand header, a bottom tab
  bar with the three items that have a real destination yet
  (Generate/Recipes/Pantry), and a fourth "You" button opening an account
  `Sheet` — the design canvas's own mobile bottom bar only fits 4 tabs
  against the desktop nav's 5, and disagrees with itself across artboards
  about what the 4th one is; resolved as one sheet holding This week,
  Preferences, theme, and sign-out, rather than picking a winner among
  three inconsistent artboards.
- `src/app/page.tsx` — replaced the Phase 2 placeholder with a real
  landing page (Logo, headline, meal tags, Sign up/Log in) built from
  3a's left panel content; an already-authenticated visitor is redirected
  to `/recipes` server-side rather than shown marketing copy.
- Four `ComingSoon` stub pages (`/generate`, `/week`, `/pantry`,
  `/preferences`) so the real, final five-item nav is clickable end-to-end
  from day one — each file is deleted outright and replaced wholesale by
  its own phase's implementation, not extended in place.
- `src/app/(app)/recipes/page.tsx` — swapped its hand-rolled
  `bg-accent text-ink` button (a Phase 1 leftover) for the shared `Button`
  component, and fixed a stale comment referencing "Phase 2" for the
  library rebuild (it's Phase 6 in this project's numbering).

#### Current Work
None — step complete.

#### Next Tasks
None under this step — `/generate`, `/week`, `/pantry`, `/preferences`
are replaced by Phases 5/7/(deferred) respectively.

### Step 3: Auth pages, magic link, onboarding
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `/login` — 3a's desktop split (warm left panel, meal tags) collapsing
  to 3c's single column below `lg`; password show/hide toggle; magic
  link added as `sendMagicLink()` with `shouldCreateUser: false` (it's
  drawn on the *login* page, never signup — without this flag a
  mistyped/unregistered email would silently create an account that
  skips onboarding) and deliberately identical copy on success or
  "account doesn't exist" failure, avoiding the enumeration leak that
  distinct messaging would open. Two things from the canvas dropped, both
  stated as decisions rather than silent omissions: "Keep me signed in"
  (no clean expression through `@supabase/ssr`'s cookie flow) and
  "Forgot password?" (no reset-password flow exists to send it to, and
  building one is real unplanned scope this phase didn't ask for).
- `/signup` — 3b's states (form, check-your-email); `emailRedirectTo` now
  passes `?next=/onboarding` so a Cloud project with email confirmation
  on lands new users in onboarding the same as local dev does (where
  `signUp()` returns a session immediately); the local-session path
  redirects to `/onboarding` directly instead of `/recipes`.
- `/onboarding` (step 1, "How you eat") + `/onboarding/pantry` (step 2,
  "Stock the pantry") — a real route per step rather than client-side
  wizard state, each with its own Server Action, both Skippable. Step 1
  writes `diets`/`allergies` to `user_preferences` via two new primitives
  (`ChipToggle` — a checkbox styled as a filled/outline chip; `TagInput`
  — type-and-press-Enter removable chips), both built now because Phase
  7's Preferences page draws the identical UI, not speculatively. Step 2
  reuses Phase 3's `parsePantryEntry` client-side for instant feedback,
  batches everything into one Server Action on Finish, and de-duplicates
  case-insensitively server-side before inserting (`pantry_items`' unique
  constraint is citext-backed; a client list isn't trusted to already be
  clean).
- `src/app/onboarding/layout.tsx` — its own minimal, unauthenticated-
  redirects-to-login chrome, deliberately not nested under `(app)` since
  onboarding has no sidebar/nav in the design.

#### Current Work
None — step complete.

#### Next Tasks
None under this step.

### Step 4: End-to-end verification in a real browser — three real bugs found and fixed
**Status**: Completed
**Date Range**: 2026-08-26

This is the step worth reading in full: nothing here was hypothetical or
speculative — each item was hit by actually using the app, not inferred
from reading code.

#### Bug 1: `.btn-primary`'s AA fix broke specifically in dark mode
Manually checking the new landing page in dark mode showed the "Get
started" button's label rendering the *same color as its own background*
— completely unreadable. Root cause: Phase 2's AA fix read
`color: var(--color-ink)` directly. `--color-ink` and `--color-bg` swap
which one is "dark" between light and dark mode, but `--color-accent`
does *not* swap the same way (it stays light-enough-to-need-a-dark-label
in both schemes) — so the fix held in light mode (ink is dark there) and
failed at roughly 1.9:1 contrast in dark mode (ink is near-white there,
on an accent that's also light).

**Fix**: two new dedicated tokens, `--color-accent-ink` /
`--color-accent-contrast`, defined per scheme (not chained from ink/bg) —
`--color-accent-ink` is always "whichever value is dark in this scheme,"
`--color-accent-contrast` is always "whichever is light." `.btn-primary`,
checked `.seg-opt`, `ChipToggle`'s checked state, and `TagInput`'s filled
chips all use these now. Verified numerically for every combination
before editing code (6 pairs, all ≥4.6:1) and pinned with a new e2e test
(`primary CTA stays AA-readable in dark mode, not just light`) that
asserts the exact color pairing in dark mode specifically — the Phase 2
dark-mode test only ever checked body background, which is exactly the
gap that let this regression through undetected.

#### Bug 2: the account `Sheet` rendered fully visible even when closed
After finishing onboarding, the account sheet appeared open and
overlapping page content on *every* page, unprompted. Root cause:
`.dialog { display: flex; ... }` in `globals.css` set `display`
unconditionally — an author rule, which *always* beats the browser's own
`dialog:not([open]) { display: none }` UA default regardless of
specificity. The component test in `Sheet.test.tsx` couldn't have caught
this: jsdom doesn't evaluate real CSS cascade against UA stylesheet
defaults at all, so `queryByRole("dialog")` returning `null` when closed
only reflected the (correctly polyfilled) `open` attribute, never the
actual rendered visibility a real browser would show.

**Fix**: moved `display: flex` onto `.dialog[open]` specifically, so it
only applies once the browser has actually opened the dialog; closed, no
author rule matches and the UA default correctly hides it.

While diagnosing this, a *separate*, tooling-only issue surfaced: the
Browser pane's manual `computer` click action reliably times out
("Browser pane is currently hidden") when clicking a button that opens a
native `showModal()` dialog in this harness. Confirmed via three
independent methods — direct DOM inspection, calling the React handler
directly, and instrumenting the `Sheet` effect with temporary logging —
that the underlying app code works correctly; the timeout is specific to
this manual testing tool's interaction with native top-layer modals, not
a product bug. Real verification of this interaction now lives in
Playwright (`e2e/auth-onboarding.spec.ts`'s "the mobile account sheet
opens via the You tab and signs out"), which drives it correctly.

#### Bug 3: signup was completely broken for a large fraction of real emails
Manually signing up with `e2e-onboarding-test@example.com` failed with a
generic "Database error saving new user." Root cause:
`handle_new_user()` (from the Phase 0 migrations, untouched until now)
derives a username from the email's local part with only `lower()` —
never sanitized against `profiles.username`'s own charset check
(`^[a-z0-9_]+$`, no hyphens/dots/plus-signs). Any real signup with a
hyphenated, dotted, or plus-addressed email — extremely common — hit this
and failed outright, with no indication why.

**Fix** (`20260825000500_fix_username_sanitization.sql`): replace every
character outside `[a-z0-9_]` with `_`, then re-pad (too-short, e.g. a
one-character local part) or truncate (too-long, leaving room for the
existing uniqueness-retry suffix) to stay within the column's 3–30 length
check. Verified directly against Postgres for both the original failing
case and a one-character local part.

#### Bug 4: no authenticated request could read or write *any* table, at all
Fixing bug 3 didn't fix signup — the very next query (`/onboarding`
reading `user_preferences`) failed with Postgres error 42501,
`permission denied for table user_preferences`, hint:
`GRANT SELECT ON public.user_preferences TO authenticated`. This is not
an RLS problem — RLS filters *rows*; this is the coarser, prior
table-level privilege check, and it was failing for *every* table.
Root cause: `supabase/config.toml`'s `auto_expose_new_tables` is unset,
matching the Supabase default that tables are **not** automatically
reachable by the `anon`/`authenticated` Data API roles — every table
needs an explicit `GRANT`, and none of the eight Phase 0–3 migrations
ever issued one. This predates every phase in this project; it was never
caught because no prior verification (CI's `db reset`/`db lint`, any unit
or component test, or manual review) ever issued an authenticated Data
API request against a table.

**Fix** (`20260825000600_grant_table_privileges.sql`): explicit grants
scoped to exactly what each table's own RLS policies already assume —
full CRUD to `authenticated` on all four tables, `SELECT` to `anon` only
on the two tables that actually have an anon-read policy (`recipes`,
`profiles`). Verified directly: table grants confirmed via
`information_schema.role_table_grants`, and the full signup →
onboarding → recipes flow completed end-to-end afterward.

#### Also found: `.env.local` pointed at a live hosted Supabase project
While root-causing why a locally-verified migration fix didn't fix the
running app, found that `.env.local` had `NEXT_PUBLIC_SUPABASE_URL`
pointed at `https://xvszriskuqfhsrakjpcn.supabase.co` — a real hosted
Cloud project, not the local Docker stack this session had been
verifying migrations against all along. **Stopped and asked before
touching it** (per this project's stated caution around external/shared
systems) rather than silently rewriting the user's environment config or
pushing migrations to an unfamiliar remote project. Confirmed: point
`.env.local` at the local stack (matches CLAUDE.md/README's own
documented workflow). Updated, with a comment explaining why and where
the values come from (`supabase status`) if the local stack is ever
restarted with different ones.

#### Current Work
None — step complete.

#### Next Tasks
None under this step.

### Step 5: e2e coverage + CI restructuring
**Status**: Completed
**Date Range**: 2026-08-26

#### Tasks Completed
- `e2e/auth-onboarding.spec.ts` — 8 new tests: the full signup → both
  onboarding steps → `/recipes` flow; Skip on both steps; a diet choice
  round-tripping through a real DB write *and* a subsequent read (only
  passes if bug 4's grants are in place); every nav destination reachable
  with no 404; the mobile account sheet opening and signing out (proof
  the Sheet actually works, driven correctly unlike the manual tool);
  unauthenticated `/recipes` redirecting to `/login`; authenticated `/`
  redirecting to `/recipes`.
- Two test-authoring bugs found and fixed while getting these green (both
  in the tests, not the app): `ChipToggle`'s real `<input>` is `sr-only`
  by design (the visual chip lives on its wrapping `<label>`) — a real
  click on the label correctly routes to the input in any browser, but
  Playwright's `locator.check()` targets the input's own near-zero-size
  box directly and refuses it as "intercepted" by the label; switched to
  `.click({ force: true })`, the documented pattern for exactly this
  shape of custom control. And `getByRole("link", { name: "Pantry" })`
  matched two elements (the intended nav link *and* the "PantryPal"
  wordmark link, "Pantry" being a case-insensitive substring of
  "PantryPal") — added `exact: true`.
- Email uniqueness in the test helper switched from
  `Date.now() + small-random-suffix` to `crypto.randomUUID()` after a
  narrower scheme produced a real collision under Playwright's default
  parallel workers (one test flaked on "still on /signup after Create
  account" — a genuine duplicate-email rejection, not an app bug).
  `randomUUID()`'s own hyphens also keep every generated email exercising
  the exact shape that broke bug 3, which a purely numeric ID wouldn't.
- `.github/workflows/ci.yml` restructured: typecheck/lint/build
  (placeholder env, fast fail) → unit tests → `supabase start`/`db
  reset`/`db lint`/type-diff → **export the now-running local stack's
  real URL/key over the placeholder ones** (`supabase status`'s own JSON
  output, piped through `jq` — confirmed this session that this CLI
  version prints JSON by default, not assumed) → a second `pnpm build`
  against that real backend (`playwright.config.ts`'s CI branch
  deliberately doesn't build itself, for exactly this reason — the
  placeholder-env build from earlier has the wrong URL baked into its
  client bundle) → Playwright → `supabase stop`. This is a real, deliberate
  policy change from "nothing in CI talks to a live Supabase project,"
  justified directly by this phase's own findings: neither bug 3 nor bug
  4 could have been caught by any amount of placeholder-env
  typecheck/build/unit-test coverage — only a step that actually signs up
  a real user against a freshly-migrated database catches them.
- `e2e/design-tokens.spec.ts` updated for the real landing page (the
  Phase 2 test targeted the old placeholder's disabled "Generate a
  recipe" button, which no longer exists), plus the new dark-mode
  contrast test from Bug 1 above.

#### Current Work
None — step complete.

#### Next Tasks
None under this step.

## Technical Notes
- `eslint-plugin-react-hooks`'s `react-hooks/set-state-in-effect` rule is
  active in this project's config and caught a real anti-pattern on first
  write (`ThemeToggle`'s original `useState` + mount-effect) — worth
  remembering this rule is on before reaching for that pattern again.
- The native `storage` DOM event fires only in *other* browsing contexts
  than the one that called `localStorage.setItem`, never the calling one
  — `lib/theme/constants.ts`'s `subscribeToThemeChanges` listens for both
  it and a synthetic same-tab event for exactly this reason.
- jsdom does not evaluate real CSS cascade against the browser's own UA
  stylesheet defaults (confirmed directly: Bug 2 was invisible to
  `Sheet.test.tsx` for exactly this reason). Component tests can prove
  React state and conditional rendering are correct; they cannot prove a
  CSS rule doesn't silently override a browser default. That's what the
  e2e layer is for, and this phase is the first time a bug in this
  category actually got caught by having one.
- `supabase status`'s default output is JSON in the CLI version this
  project uses (confirmed directly, not assumed) — CI's new
  "Export local Supabase connection details" step relies on this and on
  `jq`, which is preinstalled on GitHub-hosted `ubuntu-latest` runners.
- No `psql` client is installed on the host — all direct-Postgres
  verification in this phase (and Phase 3's) went through
  `docker exec -i supabase_db_PantryPal_v2 psql ...` against the
  container the Supabase CLI already starts.

## Dependencies
- Builds directly on Phase 2 (tokens/components) and Phase 3 (schema,
  `parsePantryEntry`, UI primitives).
- Blocks Phase 5 onward — Generate, the recipe library, Pantry, and
  Preferences all render inside this shell and this phase's stub pages.
- `.env.local` (gitignored, not part of this commit) now points at the
  local Supabase stack rather than a hosted Cloud project — noted here
  since it's invisible in the diff.

## Risks & Mitigation
- **Manual browser-pane testing cannot reliably drive native
  `showModal()` dialogs in this harness** — mitigated by relying on
  Playwright for that specific interaction going forward (already proven
  to work correctly), not by avoiding `<dialog>`-based components.
- **CI now depends on `supabase status` continuing to default to JSON
  output** — if a future CLI upgrade changes that default, the "Export
  local Supabase connection details" step would need an explicit
  `-o json` (or whatever flag replaces it) added. Worth checking if a
  `supabase/setup-cli` version bump ever causes that step to fail.

## Resources
- Plan: `~/.claude/plans/use-the-claude-design-mcp-proud-bonbon.md`
- `docs/progress/002_contracts_schema_primitives.md` — the schema/
  primitives this phase builds on

## Change Log
- **2026-08-25 → 2026-08-26**: Shell, landing page, auth pages, magic
  link, two-step onboarding, theme toggle, dynamic favicon, and four stub
  pages built. Real end-to-end browser verification against a real
  database found and fixed four genuine bugs (one dark-mode contrast
  regression from this project's own Phase 2, one CSS layering bug in
  this phase's own Sheet component, and two pre-existing Phase-0-era bugs
  — username sanitization and missing table grants — that had been latent
  and undetected since the schema was first written). CI restructured to
  run e2e against a real, freshly-migrated local Supabase stack instead
  of a placeholder, specifically because this phase proved that's the
  only way to catch bugs of this shape.
