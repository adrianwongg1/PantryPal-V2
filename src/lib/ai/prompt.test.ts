import { describe, expect, it } from "vitest";
import { buildRecipePrompt, buildRewritePrompt, type GenerateRecipeInput } from "./prompt";
import type { RecipeContent } from "./schema";

function baseInput(overrides: Partial<GenerateRecipeInput> = {}): GenerateRecipeInput {
  return {
    freeText: "half a rotisserie chicken, cooked rice, a lime",
    servings: 2,
    maxMinutes: 30,
    difficulty: "easy",
    mealType: "dinner",
    preferences: {
      diets: [],
      allergies: [],
      dislikedIngredients: [],
      preferredCuisines: [],
      spiceLevel: 1,
    },
    pantryItems: [],
    ...overrides,
  };
}

describe("buildRecipePrompt", () => {
  it("includes the free text and generation settings in the prompt", () => {
    const { prompt } = buildRecipePrompt(baseInput());
    expect(prompt).toContain("half a rotisserie chicken, cooked rice, a lime");
    expect(prompt).toContain("Servings: 2");
    expect(prompt).toContain("30 minutes");
    expect(prompt).toContain("Meal: dinner");
    expect(prompt).toContain("Effort level: easy");
  });

  it("states diets as a hard, non-optional constraint in the system prompt", () => {
    const { system } = buildRecipePrompt(
      baseInput({ preferences: { ...baseInput().preferences, diets: ["dairy_free", "vegan"] } }),
    );
    expect(system).toMatch(/MUST comply/);
    expect(system).toContain("Dairy-free");
    expect(system).toContain("Vegan");
  });

  it("states allergies as a safety prohibition, not a preference", () => {
    const { system } = buildRecipePrompt(
      baseInput({
        preferences: { ...baseInput().preferences, allergies: ["peanuts", "shellfish"] },
      }),
    );
    expect(system).toMatch(/ALLERGIC/);
    expect(system).toMatch(/safety requirement, not a preference/);
    expect(system).toContain("peanuts");
    expect(system).toContain("shellfish");
  });

  it("omits diet/allergy/dislike/cuisine constraint lines entirely when none are set", () => {
    const { system } = buildRecipePrompt(baseInput());
    expect(system).not.toMatch(/MUST comply/);
    expect(system).not.toMatch(/ALLERGIC/);
    expect(system).not.toMatch(/would rather not eat/);
    expect(system).not.toMatch(/leans toward/);
  });

  it("frames pantry contents as available, not required", () => {
    const { prompt } = buildRecipePrompt(
      baseInput({ pantryItems: ["eggs", "spring onions"] }),
    );
    expect(prompt).toMatch(/free to use if it fits/);
    expect(prompt).toContain("eggs");
    expect(prompt).toContain("spring onions");
  });

  it("omits the pantry line entirely when the pantry is empty", () => {
    const { prompt } = buildRecipePrompt(baseInput({ pantryItems: [] }));
    expect(prompt).not.toMatch(/pantry/i);
  });

  it("maps every spice level to a distinct label, falling back safely out of range", () => {
    const labels = [0, 1, 2, 3].map(
      (spiceLevel) =>
        buildRecipePrompt(baseInput({ preferences: { ...baseInput().preferences, spiceLevel } }))
          .system,
    );
    const uniqueLines = new Set(labels.map((s) => s.match(/Spice level: .+\./)?.[0]));
    expect(uniqueLines.size).toBe(4);

    const outOfRange = buildRecipePrompt(
      baseInput({ preferences: { ...baseInput().preferences, spiceLevel: 99 } }),
    ).system;
    expect(outOfRange).toMatch(/Spice level: no heat\./);
  });

  it("asks for a pantry_key distinct from the display name, for pantry matching later", () => {
    const { system } = buildRecipePrompt(baseInput());
    expect(system).toMatch(/pantry_key/);
  });
});

const BASE_RECIPE: RecipeContent = {
  title: "Charred Lime Chicken Rice",
  meal_type: "dinner",
  difficulty: "easy",
  prep_minutes: 8,
  cook_minutes: 14,
  servings: 2,
  ingredients: [{ name: "Chicken", pantry_key: "chicken", optional: false }],
  steps: [{ text: "Cook it." }],
  tags: [],
  diet_tags: [],
};

describe("buildRewritePrompt", () => {
  it("includes the current recipe as JSON and the requested change", () => {
    const { prompt } = buildRewritePrompt(BASE_RECIPE, "make it vegetarian");
    expect(prompt).toContain(JSON.stringify(BASE_RECIPE));
    expect(prompt).toContain("Requested change: make it vegetarian");
  });

  it("asks for the full recipe back, not a diff", () => {
    const { system } = buildRewritePrompt(BASE_RECIPE, "make it spicier");
    expect(system).toMatch(/complete\s+recipe again/);
    expect(system).toMatch(/not a diff/);
  });

  it("asks pantry_key to stay stable for unchanged ingredients", () => {
    const { system } = buildRewritePrompt(BASE_RECIPE, "double it");
    expect(system).toMatch(/pantry_key.*identical/);
  });

  it("still carries the shared pantry_key/optional instructions", () => {
    const { system } = buildRewritePrompt(BASE_RECIPE, "double it");
    expect(system).toMatch(/pantry_key/);
    expect(system).toMatch(/optional: true/);
  });
});
