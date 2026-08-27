# 001 - Design System Port (Organic)

## Overview
Replaces the placeholder Modernist token layer in `src/app/globals.css` with
the "Organic" Claude Design system the new UI canvas (`PantryPal v2 UI
mockups`) is drawn in — warm cream/sand ground, terracotta accent, sage
second accent, Caprasimo display over Figtree body, generous radii. Also
stands up Playwright for end-to-end testing (previously claimed in the
README but never installed) and adds the first e2e spec, verifying the token
port renders correctly in a real browser rather than just parsing as valid
CSS.

## Status
- **Started**: 2026-08-25
- **Current Step**: Verification
- **Completion**: 100%
- **Expected Completion**: 2026-08-25

## Objectives
- [x] Port Organic's core roles, neutral/accent/accent-2 ramps, spacing, radius, shadows
- [x] Replace the three-category meal-type domain layer with all five categories from the canvas
- [x] Fix two measured WCAG AA contrast failures inherited from the design system as drawn
- [x] Swap self-hosted fonts: Archivo → Caprasimo (headings) + Figtree (body)
- [x] Port the Organic component layer (`.btn`, `.tag`, `.field`, `.input`, `.radio`, `.seg`, `.card`, `.table`, `.dialog`, `.elev-*`, `.washed`) into `@layer components`
- [x] Derive a dark-mode palette (Organic ships light-only) and a `.on-dark` scope for the two screens that are dark-by-design regardless of app theme
- [x] Update the placeholder pages that consume these tokens so they don't regress into the AA failures the port fixes elsewhere
- [x] Install Playwright and write a first e2e spec covering this phase's changes
- [x] Wire e2e into CI, alongside the existing Vitest step
- [x] Update `CLAUDE.md` / `README.md` so the docs match reality

## Implementation Progress

### Step 1: Token port
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-25

#### Tasks Completed
- `src/app/globals.css` — full rewrite of the `@theme` block: core roles
  (`--color-bg/surface/ink/accent/accent-2`), full neutral/accent/accent-2
  tonal ramps (100–900), `--spacing: 4.4px` (Organic's 1.10x density as a
  single base unit — every Tailwind spacing utility inherits it), radius
  overrides (`--radius-sm/md/lg: 8/16/28px`; pills use Tailwind's built-in
  `rounded-full`), and shadow tokens.
- Kept the repo's existing role names (`--color-ink`, not Organic's own
  `--color-text`) so `text-ink` etc. keep working as Tailwind utilities —
  values underneath are Organic's, 1:1.
- Domain layer: replaced the three-category meal-type scale
  (breakfast/lunch/dinner) with all five categories drawn in the canvas
  (+ snack, dessert), values lifted directly from the canvas's own inline
  tag usage rather than recomputed.
- Dark-mode palette: bg/surface/ink derived by walking Organic's own neutral
  ramp (same method the old Modernist port used). Accent and accent-2 are
  **not invented** — lifted directly from the canvas's own dark-ground usage
  in cook mode (7b) and the "can't decide" dial screen (2d), which both
  independently land on accent-400 / accent-2-400 for accent-on-dark.
- Meal-type dark pairs computed programmatically (same hue, bg pulled to
  ~20% lightness with saturation boosted, text pushed to ~86% lightness),
  not eyeballed — every pair verified >= 6.2:1, see the contrast table
  below.
- Added `.on-dark` — a token-override class for the two screens (cook mode,
  the dial screen) that are dark by design regardless of the app's own
  light/dark theme, so they don't have to fight the `data-theme` override
  chain.
- `src/app/layout.tsx` — swapped `next/font/google` `Archivo` for
  `Caprasimo` (weight `["400"]`, the only weight it ships) and `Figtree`
  (`weight: "variable"`), both still self-hosted at build time — no
  external request, no layout shift, unlike Organic's own
  `googleapis.com` `@import`.
- Component layer ported into `@layer components` (Tailwind v4's own
  `@layer theme, base, components, utilities;` order, confirmed in
  `node_modules/tailwindcss/index.css`): `.btn` + variants, `.tag` +
  variants (+ the new `.tag-breakfast/lunch/dinner/snack/dessert` set),
  `.field`, `.input`, `.radio`/`.dot`, `.seg`/`.seg-opt`, `.card` + parts,
  `.table`, `.dialog`, `.elev-sm/md/lg`, `.washed`.

#### Current Work
None — step complete.

#### Next Tasks
None under this step.

### Step 2: Accessibility fixes
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-25

#### Tasks Completed
Two contrast failures in the design system **as drawn**, measured (WCAG 2.1
relative luminance), not eyeballed:

| Pair | Ratio | Verdict |
|---|---|---|
| `.btn-primary` label — cream `#f5ead8` on accent `#c67139` | 3.03:1 | fails AA at 13–16px |
| Bare `--color-accent` used as text color (ghost buttons, outline tags, card kickers, nav hover) | 3.03:1 | fails AA |
| `--color-neutral-600` used as text under 18px | 3.61:1 | fails AA |

Fixes applied, both taken from precedent already present in the design
itself rather than invented:

- `.btn-primary`: ink `#201e1d` label at rest (4.60:1 — matches cook mode's
  own next-step button treatment exactly), flipping to cream from the hover
  state onward once the darkening background (`accent-700`, then
  `accent-800`) passes the point where ink stops holding 4.5:1. Verified:
  ink-on-accent 4.60:1, cream-on-accent-700 5.72:1, cream-on-accent-800
  8.72:1.
- Every place text is set in the bare accent color now uses
  `--color-accent-700` (5.72:1) instead — this is Organic's **own stated
  rule** ("for paragraph-size text in the accent use a deep ramp step...
  rather than the accent itself"), its shipped component CSS just didn't
  follow that rule in `.btn-ghost`, `.tag-outline`, `.card-kicker`, and
  `nav a:hover`.
- Sub-18px text on `--color-neutral-600` moved to `--color-neutral-700`
  (5.53:1).
- The five meal-type tag pairs (breakfast/lunch/dinner/snack/dessert) were
  measured, not just carried over: all pass at 6.27–8.66:1 in light mode and
  6.27–9.99:1 in the computed dark variants.

#### Current Work
None — step complete.

#### Next Tasks
A full accessibility pass (screen reader, keyboard-only) is scoped to each
feature phase as it's built, not this one — this step only covers contrast
defects inherited from the design system's own color values.

### Step 3: Consuming placeholder pages + regression fix
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-25

#### Tasks Completed
- `src/app/page.tsx` — kept as the Phase 0/1 token-rendering proof (real
  redesign is Phase 4), but rebuilt on the ported `.btn`/`.tag` component
  classes and the five-category meal scale instead of ad hoc Tailwind
  utilities, and its stale "Modernist" comment corrected.
- Found and fixed a **live regression this token swap would otherwise have
  shipped**: the Phase 1 placeholder auth pages (`login/page.tsx`,
  `signup/page.tsx`, `AppShell.tsx`, `recipes/page.tsx`) used raw Tailwind
  utilities replicating the exact `bg-accent text-bg` / bare `text-accent`
  patterns Step 2 just fixed at the component-class level. Swapping the
  underlying token values without touching these consumers would have
  reintroduced the same AA failures immediately. Patched in place (`bg-
  accent text-bg` → `bg-accent text-ink`; `text-accent` → `text-accent-700`;
  dropped `font-extrabold`, meaningless now that Caprasimo ships only
  weight 400) without otherwise redesigning these pages — the real rebuild
  of auth is Phase 4 scope.

#### Current Work
None — step complete.

#### Next Tasks
Full auth-page redesign against Organic, magic link, onboarding — tracked
under Phase 4, not here.

### Step 4: End-to-end testing infrastructure
**Status**: Completed
**Date Range**: 2026-08-25 - 2026-08-25

#### Tasks Completed
- Installed `@playwright/test` + Chromium (`npx playwright install
  chromium --with-deps`).
- `playwright.config.ts` — `testDir: "./e2e"` (already excluded from
  `vitest.config.mts`), builds and serves the app on **port 3101**, not
  3000. This was not a hypothetical concern: the first e2e run failed all
  five assertions against garbage values, and root-causing it found that
  Playwright's `reuseExistingServer` had silently attached to an unrelated
  Next.js dev server (a different local project, "Daybreak", already
  listening on 3000) instead of starting ours. Every test failed with
  values that belonged to the wrong application, with nothing in the error
  output pointing at the actual cause. Moving off the default dev port
  makes this class of false failure structurally impossible rather than
  something to remember to check for.
- `e2e/design-tokens.spec.ts` — first e2e spec, exercising this phase's
  actual changes rather than being a placeholder: light-mode body
  background resolves to the Organic cream token, the primary CTA's label
  color and background match the Step 2 AA fix (ink-on-accent, not the
  failing cream-on-accent), button border-radius matches Organic's
  `--radius-md` (buttons are not full pills in this system — only inputs/
  tags/segments are), all five meal-type tags render, `prefers-color-
  scheme: dark` swaps to the derived dark bg/ink pair with no `data-theme`
  override present, and `/login` + `/signup` render with zero console
  errors.
- `package.json` — added `test:e2e` (`playwright test`).
- `.gitignore` — added Playwright's own output dirs
  (`test-results/`, `playwright-report/`, `blob-report/`,
  `playwright/.cache/`).
- `.github/workflows/ci.yml` — added `Install Playwright browsers` +
  `E2E tests` steps right after the existing unit-test step, plus a
  `Playwright report` artifact upload on failure. CI reuses the `pnpm
  build` step's output (the webServer command skips its own build when
  `CI=true`) rather than building twice.
- Verified: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test --run`
  (9/9), `pnpm test:e2e` (5/5) all green after the port-collision fix.

#### Current Work
None — step complete.

#### Next Tasks
Each subsequent phase adds e2e coverage for what it actually builds — this
step only stands up the infrastructure and covers Phase 2's own surface
area (design tokens, not yet any interactive feature).

## Technical Notes
- Tailwind v4's `@layer theme, base, components, utilities;` order
  (confirmed in `node_modules/tailwindcss/index.css`) is what makes
  `@layer components` the correct place for the ported `.btn`/`.tag`/etc.
  classes — they sit below the `utilities` layer, so a one-off Tailwind
  utility class in JSX can still override a component class when needed.
- The full neutral/accent/accent-2 numbered ramps (100–900) are **not**
  overridden in dark mode — only the semantic roles (`--color-bg`,
  `--color-surface`, `--color-ink`, `--color-accent`, `--color-accent-2`)
  and the meal-type domain pairs are. This matches the convention the
  existing (Modernist-era) dark override already used. One known
  consequence, called out rather than silently accepted: components that
  reference numbered ramp steps directly for background fills (`.tag-
  neutral`, `.tag-accent`, `.tag-accent-2`) will keep their light-authored
  values even in dark mode — light chips on a dark page. The canvas draws
  zero dark-mode screens, so there's no design reference to correct this
  against; flagged as a gap for whichever phase first ships a dark-mode
  screen with these components on it, rather than guessed at now.
- `--spacing: 4.4px` changes the base unit for every Tailwind spacing
  utility in the app (`p-4`, `gap-2`, ...), not just new code — worth
  knowing before reading a "why did this padding change" diff in an
  unrelated file later.

## Dependencies
- Blocks every later phase — all of them build UI against these tokens and
  component classes.
- `@playwright/test` (devDependency) + a locally cached Chromium binary
  (`~/Library/Caches/ms-playwright` / `~/.cache/ms-playwright`), installed
  via `npx playwright install`. CI installs its own via `npx playwright
  install --with-deps chromium`.

## Risks & Mitigation
- **Port-collision false failures** (see Step 4) — mitigated by pinning
  Playwright to port 3101 instead of the shared dev port.
- **Dark-mode component gap** noted above — accepted for now, flagged for
  whichever phase first needs it, not fixed speculatively without a design
  reference.

## Resources
- Plan: `~/.claude/plans/use-the-claude-design-mcp-proud-bonbon.md`
- Design canvas: `PantryPal v2 UI mockups` (Claude Design project
  `979ae700-3fcc-490d-92a1-98e6ee452f2c`)
- `CLAUDE.md` — Design tokens / End-to-end tests sections, updated in this
  phase

## Change Log
- **2026-08-25**: Organic token port, AA fixes, placeholder-page regression
  fix, Playwright setup + first e2e spec, CI wiring, docs updated.
