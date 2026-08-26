import { test, expect } from "@playwright/test";

// Library, detail, edit, and share — Phase 6. Same real-backend/mocked-
// model split as generate.spec.ts: everything except the AI call runs
// against a real local Supabase (auth, RLS, table grants), and
// MOCK_AI_RESPONSES swaps the model call for a fixed, deterministic
// recipe (see lib/ai/generate.ts) so this suite is fast and reproducible.
// "Ask for a rewrite" is exercised too — its mock (buildMockRewriteRecipe)
// deterministically appends "(rewritten: <instruction>)" to the title, so
// the rewrite pipeline itself (client values -> rewriteRecipeAction ->
// rewriteRecipe -> form field replacement) is verified without a live call.

function uniqueEmail(label: string): string {
  return `e2e-${label}-${crypto.randomUUID()}@example.com`;
}

async function signUpAndReachRecipes(page: import("@playwright/test").Page) {
  const email = uniqueEmail("recipes");
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

// Generates (mocked) and saves one recipe, landing back on /recipes with
// it in the library. Returns the recipe's detail URL.
async function createSavedRecipe(page: import("@playwright/test").Page): Promise<string> {
  await page.getByRole("link", { name: "Generate", exact: true }).click();
  await page.getByPlaceholder(/half a rotisserie chicken/).fill("chicken, rice, lime");
  await page.getByRole("button", { name: "Make me something" }).click();
  await expect(
    page.getByRole("heading", { name: "Mock Seared Chicken Rice Bowl" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save to my recipes" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await page.getByText("Mock Seared Chicken Rice Bowl").click();
  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+$/);
  return page.url();
}

test.describe("library", () => {
  test("empty state points at Generate, then a saved recipe renders as a card", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await expect(page.getByText("No recipes yet.")).toBeVisible();

    await createSavedRecipe(page);
    // Landed on the detail page from createSavedRecipe -> go back to check the card.
    await page.goto("/recipes");
    await expect(page.getByText("Mock Seared Chicken Rice Bowl")).toBeVisible();
    await expect(page.getByText("No recipes yet.")).not.toBeVisible();
  });

  test("search narrows to a matching title and clears via the filter link", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);
    await page.goto("/recipes");

    await page.getByPlaceholder("Search your recipes…").fill("Seared Chicken");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("Mock Seared Chicken Rice Bowl")).toBeVisible();

    await page.getByPlaceholder("Search your recipes…").fill("nonexistent xyz");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("No recipes match.")).toBeVisible();

    await page.getByRole("link", { name: "clear your filters" }).click();
    await expect(page.getByText("Mock Seared Chicken Rice Bowl")).toBeVisible();
  });

  test("the Dinner meal filter chip toggles on and off", async ({ page }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);
    await page.goto("/recipes");

    await page.getByRole("link", { name: "Dinner", exact: true }).click();
    await expect(page).toHaveURL(/meal=dinner/);
    await expect(page.getByText("Mock Seared Chicken Rice Bowl")).toBeVisible();

    await page.getByRole("link", { name: "Dinner", exact: true }).click();
    await expect(page).not.toHaveURL(/meal=dinner/);
  });
});

test.describe("recipe detail", () => {
  test("renders ingredients with pantry ticks, the missing-ingredients card, and method timers", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);

    // No pantry stocked (onboarding was skipped) -> the 2 required
    // ingredients (Chicken thighs, Rice) are both missing; the 3rd (Lime
    // wedges) is optional and excluded from the count entirely.
    await expect(page.getByText("You have 0 of 2 things")).toBeVisible();
    await expect(page.getByText(/You.re 2 short/)).toBeVisible();
    await expect(page.getByText("15 min", { exact: true })).toBeVisible();
    await expect(page.getByText("8 min", { exact: true })).toBeVisible();
  });

  test("Duplicate creates a private copy and redirects to its edit page", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);

    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+\/edit$/);
    await expect(page.getByLabel("Title")).toHaveValue(
      "Mock Seared Chicken Rice Bowl (copy)",
    );
    await expect(page.getByRole("radio", { name: /Private/ })).toBeChecked();
  });

  test("Delete asks for confirmation and removes the recipe", async ({ page }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();

    await expect(page).toHaveURL(/\/recipes$/);
    await expect(page.getByText("No recipes yet.")).toBeVisible();
  });
});

test.describe("edit", () => {
  test("editing a field surfaces it by name in the sticky save bar, and saving persists it", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/edit$/);

    // Regression guard: the save bar must NOT appear on a clean load —
    // found live in this phase (react-hook-form's isDirty briefly reports
    // true immediately after mount when the form uses useFieldArray, even
    // though nothing changed and dirtyFields is genuinely empty).
    await expect(page.getByText(/Unsaved changes/)).not.toBeVisible();

    await page.getByLabel("Title").fill("My Own Chicken Bowl");
    await expect(page.getByText("Unsaved changes: Title")).toBeVisible();

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: "My Own Chicken Bowl" })).toBeVisible();
  });

  test("quick-add parses a free-text ingredient into its own row", async ({ page }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);
    await page.getByRole("link", { name: "Edit" }).click();

    await page.getByPlaceholder(/Quick add/).fill("2 avocados");
    await page.getByPlaceholder(/Quick add/).press("Enter");

    const names = page.locator('input[name^="ingredients."][name$=".name"]');
    await expect(names).toHaveCount(4);
    await expect(names.last()).toHaveValue("avocados");
  });

  test("Ask for a rewrite replaces the form's content and requires an explicit save", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);
    await page.getByRole("link", { name: "Edit" }).click();

    await page.getByRole("button", { name: "Make it spicier" }).click();
    await expect(page.getByLabel("Title")).toHaveValue(
      "Mock Seared Chicken Rice Bowl (rewritten: Make it spicier)",
    );
    await expect(page.getByText(/Unsaved changes/)).toBeVisible();

    // Not persisted until Save is clicked.
    await page.reload();
    await expect(page.getByLabel("Title")).toHaveValue("Mock Seared Chicken Rice Bowl");
  });

  test("reordering ingredients via the keyboard moves the dragged row", async ({ page }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);
    await page.getByRole("link", { name: "Edit" }).click();

    const names = page.locator('input[name^="ingredients."][name$=".name"]');
    const firstName = await names.nth(0).inputValue();
    const secondName = await names.nth(1).inputValue();

    const firstHandle = page.getByRole("button", { name: "Drag to reorder" }).first();
    await firstHandle.focus();
    await firstHandle.press("Space");
    await page.waitForTimeout(200);
    await firstHandle.press("ArrowDown");
    await page.waitForTimeout(200);
    await firstHandle.press("Space");

    await expect(names.nth(0)).toHaveValue(secondName);
    await expect(names.nth(1)).toHaveValue(firstName);
  });

  test("setting visibility to public generates a share link that resolves on /r/[slug]", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);
    await page.getByRole("link", { name: "Edit" }).click();

    await page.getByText("Public — listed and linkable").click();
    await expect(page.getByText(/A link will be created/)).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+$/);
    const linkText = await page.locator("code").textContent();
    expect(linkText).toMatch(/\/r\/[a-z0-9]+$/);
    const slug = linkText?.split("/r/")[1];

    // The share page is public -- a fresh, unauthenticated context proves
    // it doesn't depend on the owner's session.
    const shared = await page.context().browser()!.newContext();
    const sharedPage = await shared.newPage();
    await sharedPage.goto(`/r/${slug}`);
    await expect(
      sharedPage.getByRole("heading", { name: "Mock Seared Chicken Rice Bowl" }),
    ).toBeVisible();
    await expect(sharedPage.getByText(/^by /)).toBeVisible();
    await shared.close();
  });
});

test.describe("cross-user recipe scoping", () => {
  // Regression test for a real bug found live in this phase: "recipes:
  // owner select" and "recipes: anyone can read fully-public recipes" are
  // separate, OR'd RLS policies (Postgres RLS policies are permissive by
  // default), so a query relying on RLS alone to mean "my recipes" also
  // returns *other* users' public recipes. Reproduced live with a second
  // real account seeing a public recipe it didn't own on its own library
  // page, complete with Edit/Duplicate/Delete controls meant for the
  // owner. Fixed with an explicit `.eq("user_id", user.id)` on every
  // owner-scoped query, not just the RLS policy — this test guards the
  // fix directly, both on the library list and the detail page.
  test("another user's public recipe never appears in my library or detail page, only via its own /r/[slug] link", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);
    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByText("Public — listed and linkable").click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/recipes\/([0-9a-f-]+)$/);
    const ownerRecipeUrl = page.url();
    const recipeId = ownerRecipeUrl.match(/\/recipes\/([0-9a-f-]+)$/)?.[1];
    const linkText = await page.locator("code").textContent();
    const slug = linkText?.split("/r/")[1];

    const otherContext = await page.context().browser()!.newContext();
    const otherPage = await otherContext.newPage();
    await signUpAndReachRecipes(otherPage);

    await expect(otherPage.getByText("No recipes yet.")).toBeVisible();
    await expect(otherPage.getByText("Mock Seared Chicken Rice Bowl")).not.toBeVisible();

    const response = await otherPage.goto(`/recipes/${recipeId}`);
    expect(response?.status()).toBe(404);

    // The same recipe is still genuinely public via its own share link.
    await otherPage.goto(`/r/${slug}`);
    await expect(
      otherPage.getByRole("heading", { name: "Mock Seared Chicken Rice Bowl" }),
    ).toBeVisible();

    await otherContext.close();
  });
});

test.describe("share page", () => {
  test("an unknown slug 404s rather than leaking whether it ever existed", async ({ page }) => {
    const response = await page.goto("/r/this-slug-does-not-exist-at-all");
    expect(response?.status()).toBe(404);
  });

  test("a private recipe's slug (none exists) cannot be reached — visiting any made-up slug 404s the same way", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page);
    await createSavedRecipe(page);
    // Never shared -> share_slug is null -> nothing to visit; confirms the
    // detail page's own "This recipe is shared" card is correctly absent.
    await expect(page.getByText("This recipe is shared")).not.toBeVisible();
  });
});
