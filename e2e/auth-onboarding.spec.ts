import { test, expect } from "@playwright/test";

// Phase 4: exercises the real signup -> onboarding -> shell flow against a
// real (local) Supabase backend, not mocks. This is deliberately not a
// unit-testable path: two real bugs surfaced only by running this exact
// sequence in a real browser against a real database during Phase 4 —
// handle_new_user() rejecting any email with a hyphen in its local part
// (profiles.username's charset check), and Postgres never having granted
// SELECT/INSERT/UPDATE/DELETE on any table to anon/authenticated at all
// (supabase/config.toml's auto_expose_new_tables default). Neither would
// be caught by typecheck, unit tests, or a mocked component test — only by
// actually completing a signup against a real, freshly-migrated database.
//
// Requires the local Supabase stack running and migrated (`supabase start`
// && `supabase db reset`) and .env.local/CI env pointed at it — see
// CLAUDE.md's End-to-end tests section.

function uniqueEmail(label: string): string {
  // Both the "e2e-<label>-" prefix and randomUUID()'s own hyphens keep
  // this the exact shape of email that broke handle_new_user() before the
  // fix in 20260825000500_fix_username_sanitization.sql — worth failing
  // loudly again if that regresses. randomUUID() (not Date.now() + a small
  // random suffix) specifically because these tests run in parallel
  // workers against the same dev server and database; a narrower scheme
  // collided often enough in practice to make one test flake on "still on
  // /signup after Create account" — a real duplicate-email rejection, not
  // a bug in the app.
  return `e2e-${label}-${crypto.randomUUID()}@example.com`;
}

// ChipToggle's real <input type="checkbox"> is visually sr-only (the
// filled/outline look lives on its wrapping <label>) — correct for a real
// click, which a browser routes through the label to its associated
// control regardless of the input's own size, but Playwright's
// locator.check()/click() target the checkbox element's own (effectively
// zero-size) box directly and refuse it as "intercepted" by the label.
// force:true is the standard, documented way to drive this exact shape of
// custom checkbox.
async function checkDiet(page: import("@playwright/test").Page, diet: string) {
  await page.getByRole("checkbox", { name: diet }).click({ force: true });
}

test.describe("signup through onboarding to the app shell", () => {
  test("completes both onboarding steps and lands on /recipes inside the shell", async ({
    page,
  }) => {
    const email = uniqueEmail("full-flow");

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/Password/).fill("testpass123");
    await page.getByRole("button", { name: "Create account" }).click();

    // No email confirmation locally (supabase/config.toml) -> signUp()
    // returns a session immediately -> straight to onboarding, not a
    // "check your email" state.
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByText("Step 1 of 2")).toBeVisible();

    await checkDiet(page, "vegetarian");
    const allergyInput = page.getByPlaceholder("Add one");
    await allergyInput.fill("peanuts");
    await allergyInput.press("Enter");
    await expect(page.getByRole("button", { name: "Remove peanuts" })).toBeVisible();

    await page.getByRole("button", { name: "Next — stock the pantry" }).click();
    await expect(page).toHaveURL(/\/onboarding\/pantry$/);
    await expect(page.getByText("Step 2 of 2")).toBeVisible();

    const pantryInput = page.getByPlaceholder(/Add anything/);
    await pantryInput.fill("2 limes");
    await pantryInput.press("Enter");
    await expect(page.getByText("limes", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Add 1 and finish|Finish/ }).click();

    // Lands inside the real AppShell, not the onboarding chrome.
    await expect(page).toHaveURL(/\/recipes$/);
    await expect(page.getByRole("heading", { name: "Your recipes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My recipes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("Skip on both onboarding steps still reaches /recipes", async ({ page }) => {
    const email = uniqueEmail("skip-flow");

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/Password/).fill("testpass123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByRole("button", { name: "Skip" }).click();

    await expect(page).toHaveURL(/\/onboarding\/pantry$/);
    await page.getByRole("button", { name: "Skip" }).click();

    await expect(page).toHaveURL(/\/recipes$/);
  });

  test("a diet choice from onboarding round-trips through a real DB write and read", async ({
    page,
  }) => {
    // Not just a UI assertion: navigating back to /onboarding re-fetches
    // user_preferences server-side (see onboarding/page.tsx) and passes it
    // as defaultChecked — so this only passes if the earlier save actually
    // reached the database (not just client-side form state) and the
    // read-back path is itself allowed (the exact permission this session
    // found missing in 20260825000600_grant_table_privileges.sql).
    const email = uniqueEmail("persist-check");
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/Password/).fill("testpass123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    await checkDiet(page, "vegan");
    await page.getByRole("button", { name: "Next — stock the pantry" }).click();
    await expect(page).toHaveURL(/\/onboarding\/pantry$/);

    await page.goto("/onboarding");
    await expect(page.getByRole("checkbox", { name: "vegan" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "vegetarian" })).not.toBeChecked();
  });
});

test.describe("app shell", () => {
  async function signUpAndReachRecipes(page: import("@playwright/test").Page) {
    const email = uniqueEmail("shell");
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/Password/).fill("testpass123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page).toHaveURL(/\/onboarding\/pantry$/);
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page).toHaveURL(/\/recipes$/);
  }

  test("every nav destination is reachable and none 404", async ({ page }) => {
    await signUpAndReachRecipes(page);
    for (const [label, heading] of [
      ["Generate", /What.s in your kitchen tonight\?/],
      ["This week", "This week"],
      ["Pantry", "Your pantry"],
      ["Preferences", "How you eat"],
    ] as const) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });

  test("the mobile account sheet opens via the You tab and signs out", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signUpAndReachRecipes(page);

    await page.getByRole("button", { name: "You" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Your account")).toBeVisible();

    await dialog.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an unauthenticated visit to /recipes redirects to /login", async ({ page }) => {
    await page.goto("/recipes");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an already-authenticated visit to / redirects straight to /recipes", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/recipes$/);
  });
});
