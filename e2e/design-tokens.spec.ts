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

  test("primary CTA meets the AA contrast fix (ink label on accent, not cream)", async ({
    page,
  }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Get started" });
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

  test("primary CTA stays AA-readable in dark mode, not just light", async ({ page }) => {
    // Regression test: --color-ink and --color-bg SWAP which one is "dark"
    // between light and dark mode, but --color-accent doesn't swap the
    // same way (it's light-enough-to-need-a-dark-label in both schemes).
    // An earlier version of .btn-primary read `color: var(--color-ink)`
    // directly, which passed this exact check in light mode and rendered
    // at ~1.9:1 (near-invisible) in dark mode — caught by looking at an
    // actual dark-mode screenshot, not by re-deriving the light-mode
    // numbers. --color-accent-ink / --color-accent-contrast exist
    // specifically so this can't happen again; this test pins that.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Get started" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveCSS("background-color", "rgb(246, 160, 107)"); // dark --color-accent
    await expect(cta).toHaveCSS("color", DARK_BG); // dark --color-accent-ink == dark --color-bg
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
