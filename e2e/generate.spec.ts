import { test, expect } from "@playwright/test";

// Exercises the real /generate Server Action pipeline end to end — form
// submit -> rate-limit check -> preferences/pantry reads -> generateRecipe
// -> sanitizeRecipe -> render -> save -> library read-back — against a
// real (local) Supabase backend, same as auth-onboarding.spec.ts.
//
// The model call itself is mocked (see MOCK_AI_RESPONSES in
// lib/ai/generate.ts and webServer.env in playwright.config.ts), by the
// user's own explicit choice: real Groq/Anthropic calls are what actually
// caught three genuine bugs while building this phase (a removed model, a
// Groq-specific JSON Schema requirement, and the model writing a redundant
// "(optional)" into an ingredient name), but a live model in CI means
// non-deterministic assertions, slower/flakier runs, and a real API key
// as a CI secret purely to run tests. The mock recipe deliberately
// reproduces the exact "(optional)" shape that caused the third bug, so
// this suite still catches a regression of it — just without spending a
// real API call on every run. `pnpm dev` / a normal `pnpm start` never set
// the flag, so using the actual app always calls the real APIs.

function uniqueEmail(label: string): string {
  return `e2e-${label}-${crypto.randomUUID()}@example.com`;
}

async function signUpAndReachRecipes(page: import("@playwright/test").Page) {
  const email = uniqueEmail("generate");
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

test.describe("generate", () => {
  test("submitting renders the mocked recipe, without doubling the ingredient's own \"(optional)\" text", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await page.getByRole("link", { name: "Generate", exact: true }).click();

    await page
      .getByPlaceholder(/half a rotisserie chicken/)
      .fill("chicken thighs, rice, lime");
    await page.getByRole("button", { name: "Make me something" }).click();

    const card = page.getByRole("heading", { name: "Mock Seared Chicken Rice Bowl" });
    await expect(card).toBeVisible();

    // The mock's ingredient name already contains "(optional)" (reproducing
    // the exact bug this session found); sanitizeRecipe() must strip it
    // before the UI adds its own " (optional)" suffix for
    // ingredient.optional — so exactly one "(optional)" should render, not
    // "(optional) (optional)".
    const limeRow = page.getByText(/Lime wedges/);
    await expect(limeRow).toHaveText("Lime wedges (optional)");

    // No pantry items were stocked (onboarding was skipped) -> neither of
    // the two *required* ingredients can be matched. The third (lime
    // wedges) is optional, so summarizePantryMatch excludes it from this
    // count entirely — see pantry-match.ts.
    await expect(page.getByText("You have 0 of 2 things")).toBeVisible();
  });

  test("Save to my recipes persists the recipe and it appears in the library", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await page.getByRole("link", { name: "Generate", exact: true }).click();

    await page
      .getByPlaceholder(/half a rotisserie chicken/)
      .fill("chicken thighs, rice, lime");
    await page.getByRole("button", { name: "Make me something" }).click();
    await expect(
      page.getByRole("heading", { name: "Mock Seared Chicken Rice Bowl" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Save to my recipes" }).click();

    // saveRecipeAction redirects here only on a successful insert — RLS and
    // the owner-only insert policy both have to actually allow it.
    await expect(page).toHaveURL(/\/recipes$/);
    await expect(
      page.getByText("Mock Seared Chicken Rice Bowl"),
    ).toBeVisible();
  });
});
