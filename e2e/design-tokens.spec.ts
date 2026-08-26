import { test, expect, type Page } from "@playwright/test";

// Phase 2: verifies the Organic token port actually renders — not just that
// globals.css parses, but that the browser resolves the right computed
// values on a real page. Catches the class of bug a visual diff misses:
// a token that's defined but never wired to the component that uses it.

const CREAM_BG = "rgb(245, 234, 216)"; // --color-bg light
const DARK_BG = "rgb(28, 26, 21)"; // --color-bg dark
const INK = "rgb(32, 30, 29)"; // --color-ink light / .btn-primary rest-state label

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("design token port", () => {
  test("landing page renders the light-mode Organic palette", async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/");

    await expect(page.locator("body")).toHaveCSS("background-color", CREAM_BG);

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    // Caprasimo, with the documented Georgia/serif fallback chain — not the
    // old Archivo stack.
    await expect(heading).toHaveCSS("font-family", /Caprasimo/);

    expect(errors, `console errors: ${errors.join("\n")}`).toHaveLength(0);
  });

  test("primary button meets the AA contrast fix (ink label on accent, not cream)", async ({
    page,
  }) => {
    await page.goto("/");
    const cta = page.getByRole("button", { name: /generate a recipe/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveCSS("color", INK);
    await expect(cta).toHaveCSS("background-color", "rgb(198, 113, 57)"); // --color-accent
    // Organic's own component radius (--radius-md, 16px) — buttons are not
    // full pills in this system, only inputs/tags/segments are.
    await expect(cta).toHaveCSS("border-radius", "16px");
  });

  test("meal-type tags use the five-category domain layer", async ({
    page,
  }) => {
    await page.goto("/");
    for (const label of ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("prefers-color-scheme: dark swaps bg/ink without a data-theme override", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("body")).toHaveCSS("background-color", DARK_BG);
  });

  test("login and signup render without console errors", async ({ page }) => {
    for (const path of ["/login", "/signup"]) {
      const errors = collectConsoleErrors(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        errors,
        `console errors on ${path}: ${errors.join("\n")}`,
      ).toHaveLength(0);
    }
  });
});
