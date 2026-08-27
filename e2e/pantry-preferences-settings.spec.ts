import { test, expect } from "@playwright/test";

// Pantry, Preferences, and Settings — Phase 7. Same real-backend/mocked-
// model split as the rest of this suite (see generate.spec.ts): everything
// runs against a real local Supabase, and the one AI call this file
// touches (generating a recipe to test default-visibility and the diet
// clash card) is mocked via MOCK_AI_RESPONSES, same as elsewhere.

function uniqueEmail(label: string): string {
  return `e2e-${label}-${crypto.randomUUID()}@example.com`;
}

async function signUpAndReachRecipes(page: import("@playwright/test").Page, label: string) {
  const email = uniqueEmail(label);
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Password/).fill("testpass123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page).toHaveURL(/\/onboarding\/pantry$/);
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  return email;
}

test.describe("pantry", () => {
  test("empty state, adding a categorized item, use-soon flagging, and delete", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page, "pantry");
    await page.goto("/pantry");
    await expect(page.getByText("Nothing in your pantry yet.")).toBeVisible();

    await page.getByPlaceholder(/Add anything/).fill("2 limes");
    await page.getByLabel("Where it lives (optional)").selectOption("fridge");
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByRole("heading", { name: "Fridge", level: 2 })).toBeVisible();
    await expect(page.getByText("limes")).toBeVisible();
    await expect(page.locator("li", { hasText: "limes" }).getByText("2", { exact: true })).toBeVisible();

    // A second item expiring tomorrow should get the "use soon" flag.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = tomorrow.toISOString().slice(0, 10);
    await page.getByPlaceholder(/Add anything/).fill("chicken breast");
    await page.getByLabel("Expires on (optional)").fill(iso);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("use soon")).toBeVisible();

    await page.getByRole("button", { name: "Remove limes" }).click();
    await expect(page.getByText("limes")).not.toBeVisible();
    await expect(page.getByText("chicken breast")).toBeVisible();
  });

  test("re-adding an existing item updates its quantity instead of erroring", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page, "pantry-upsert");
    await page.goto("/pantry");

    await page.getByPlaceholder(/Add anything/).fill("2 eggs");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("eggs")).toBeVisible();

    await page.getByPlaceholder(/Add anything/).fill("6 eggs");
    await page.getByRole("button", { name: "Add" }).click();

    const rows = page.locator("li", { hasText: "eggs" });
    await expect(rows).toHaveCount(1);
    await expect(rows.getByText("6", { exact: true })).toBeVisible();
  });
});

test.describe("preferences", () => {
  test("saving a diet persists across reload and drives the 'what this changes' rail", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page, "prefs");
    await page.goto("/preferences");

    await page.getByRole("checkbox", { name: "Vegan" }).click({ force: true });
    await page.getByRole("button", { name: "Save preferences" }).click();

    await expect(page).toHaveURL(/\/preferences$/);
    await expect(page.getByText("Every recipe is Vegan.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Vegan" })).toBeChecked();
  });

  test("a saved recipe missing a newly-required diet shows up as a clash", async ({ page }) => {
    await signUpAndReachRecipes(page, "prefs-clash");

    // The mock recipe's diet_tags is always [] (lib/ai/generate.ts) — any
    // non-empty required diet makes it clash by definition, which is
    // exactly the scenario this test needs.
    await page.getByRole("link", { name: "Generate", exact: true }).click();
    await page.getByPlaceholder(/half a rotisserie chicken/).fill("chicken, rice, lime");
    await page.getByRole("button", { name: "Make me something" }).click();
    await expect(
      page.getByRole("heading", { name: "Mock Seared Chicken Rice Bowl" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save to my recipes" }).click();
    await expect(page).toHaveURL(/\/recipes$/);

    await page.goto("/preferences");
    await expect(page.getByText(/saved recipe clash/)).not.toBeVisible();

    await page.getByRole("checkbox", { name: "Vegan" }).click({ force: true });
    await page.getByRole("button", { name: "Save preferences" }).click();

    await expect(page.getByText("1 saved recipe clash")).toBeVisible();
  });
});

test.describe("settings", () => {
  test("theme applies instantly and every setting persists across reload", async ({ page }) => {
    await signUpAndReachRecipes(page, "settings");
    await page.goto("/preferences/settings");

    // The Seg control's underlying radio input is visually zero-size (the
    // pill is drawn from its label), same shape of control as the diet
    // chips — clicking the label text is the reliable way to drive it,
    // same reasoning as auth-onboarding.spec.ts's checkDiet() helper.
    await page.getByText("Dark", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByText("Imperial", { exact: true }).click();
    await expect(page.getByRole("radio", { name: "Imperial" })).toBeChecked();
    await page.getByRole("checkbox", { name: /about to expire/ }).click();
    await expect(page.getByRole("checkbox", { name: /about to expire/ })).not.toBeChecked();
    await page.getByText("Public — listed and linkable").click();
    await expect(page.getByRole("radio", { name: /Public — listed/ })).toBeChecked();
    await page.getByRole("button", { name: "Save settings" }).click();

    await page.reload();
    await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Imperial" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /about to expire/ })).not.toBeChecked();
    await expect(page.getByRole("radio", { name: /Public — listed/ })).toBeChecked();
  });

  test("default visibility is applied to a newly saved recipe", async ({ page }) => {
    await signUpAndReachRecipes(page, "settings-visibility");
    await page.goto("/preferences/settings");
    await page.getByText("Public — listed and linkable").click();
    await page.getByRole("button", { name: "Save settings" }).click();

    await page.getByRole("link", { name: "Generate", exact: true }).click();
    await page.getByPlaceholder(/half a rotisserie chicken/).fill("chicken, rice, lime");
    await page.getByRole("button", { name: "Make me something" }).click();
    await expect(
      page.getByRole("heading", { name: "Mock Seared Chicken Rice Bowl" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save to my recipes" }).click();

    // saveRecipeAction redirects to the library, not straight into the
    // detail page — same as generate.spec.ts's own save flow.
    await expect(page).toHaveURL(/\/recipes$/);
    await page.getByText("Mock Seared Chicken Rice Bowl").click();
    await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]+$/);
    await expect(page.getByText("This recipe is shared")).toBeVisible();
    const shareUrl = await page.locator("code").textContent();
    expect(shareUrl).toMatch(/\/r\/[a-z0-9]+$/);
  });

  test("the data export route returns this account's own data as a download", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page, "settings-export");
    const response = await page.request.get("/preferences/settings/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toContain("attachment");
    const body = await response.json();
    expect(body).toHaveProperty("preferences");
    expect(body).toHaveProperty("recipes");
    expect(body).toHaveProperty("pantry_items");
  });

  test("changing password takes effect immediately", async ({ page }) => {
    const email = await signUpAndReachRecipes(page, "settings-password");
    await page.goto("/preferences/settings");

    await page.getByLabel("New password").fill("newpass456");
    await page.getByRole("button", { name: "Update account" }).click();
    await expect(page.getByText("Password updated.")).toBeVisible();

    // AppShell renders three sign-out forms (desktop sidebar, tablet icon
    // rail, and the mobile account Sheet) — only one is actually visible
    // at any given viewport, so this needs :visible to avoid a strict-mode
    // multiple-match error.
    await page.locator('form[action="/auth/signout"] button:visible').click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/Password/).fill("newpass456");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/recipes$/);
  });

  test("deleting the account requires typing DELETE and signs the session out for good", async ({
    page,
  }) => {
    await signUpAndReachRecipes(page, "settings-delete");
    await page.goto("/preferences/settings");

    const deleteButton = page.getByRole("button", { name: "Delete my account" });
    await expect(deleteButton).toBeDisabled();

    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    await expect(page).toHaveURL("/");

    await page.goto("/recipes");
    await expect(page).toHaveURL(/\/login$/);
  });
});
