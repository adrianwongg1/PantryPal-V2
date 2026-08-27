import { describe, expect, it } from "vitest";
import {
  dietTagSchema,
  difficultySchema,
  ingredientSchema,
  mealTypeSchema,
  recipeContentSchema,
  stepSchema,
} from "./schema";

const validIngredient = { name: "Lime, halved", pantry_key: "lime" };
const validStep = { text: "Char the lime halves cut-side down for a minute." };

function validRecipe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Charred Lime & Chicken Rice Bowls",
    meal_type: "dinner",
    ingredients: [validIngredient],
    steps: [validStep],
    ...overrides,
  };
}

describe("mealTypeSchema / difficultySchema / dietTagSchema", () => {
  it("accepts every enum member", () => {
    for (const v of ["breakfast", "lunch", "dinner", "snack", "dessert"]) {
      expect(mealTypeSchema.parse(v)).toBe(v);
    }
    for (const v of ["easy", "medium", "hard"]) {
      expect(difficultySchema.parse(v)).toBe(v);
    }
    expect(dietTagSchema.parse("gluten_free")).toBe("gluten_free");
  });

  it("rejects values outside the enum", () => {
    expect(() => mealTypeSchema.parse("brunch")).toThrow();
    expect(() => difficultySchema.parse("nightmare")).toThrow();
    expect(() => dietTagSchema.parse("carnivore")).toThrow();
  });
});

describe("ingredientSchema", () => {
  it("accepts a minimal ingredient and defaults optional to false", () => {
    const parsed = ingredientSchema.parse(validIngredient);
    expect(parsed.optional).toBe(false);
    expect(parsed.quantity).toBeUndefined();
    expect(parsed.unit).toBeUndefined();
  });

  it("accepts a fully specified ingredient", () => {
    const parsed = ingredientSchema.parse({
      name: "Honey",
      pantry_key: "honey",
      quantity: 1,
      unit: "tbsp",
      optional: true,
    });
    expect(parsed).toMatchObject({
      name: "Honey",
      pantry_key: "honey",
      quantity: 1,
      unit: "tbsp",
      optional: true,
    });
  });

  it("rejects an empty name or pantry_key (DB check: length >= 1)", () => {
    expect(() => ingredientSchema.parse({ ...validIngredient, name: "" })).toThrow();
    expect(() =>
      ingredientSchema.parse({ ...validIngredient, pantry_key: "" }),
    ).toThrow();
  });

  it("rejects name over 120 chars and pantry_key over 80 (DB column limits)", () => {
    expect(() =>
      ingredientSchema.parse({ ...validIngredient, name: "a".repeat(121) }),
    ).toThrow();
    expect(() =>
      ingredientSchema.parse({ ...validIngredient, pantry_key: "a".repeat(81) }),
    ).toThrow();
  });

  it("rejects non-positive or absurd quantities", () => {
    expect(() =>
      ingredientSchema.parse({ ...validIngredient, quantity: 0 }),
    ).toThrow();
    expect(() =>
      ingredientSchema.parse({ ...validIngredient, quantity: -1 }),
    ).toThrow();
    expect(() =>
      ingredientSchema.parse({ ...validIngredient, quantity: 10_001 }),
    ).toThrow();
  });
});

describe("stepSchema", () => {
  it("accepts a step without a timer", () => {
    const parsed = stepSchema.parse(validStep);
    expect(parsed.timer_minutes).toBeUndefined();
  });

  it("accepts a positive integer timer_minutes", () => {
    expect(stepSchema.parse({ ...validStep, timer_minutes: 4 }).timer_minutes).toBe(4);
  });

  it("rejects a zero, negative, fractional, or too-large timer", () => {
    for (const timer_minutes of [0, -1, 2.5, 601]) {
      expect(() => stepSchema.parse({ ...validStep, timer_minutes })).toThrow();
    }
  });

  it("rejects an empty step or one over 2000 chars (DB column limit)", () => {
    expect(() => stepSchema.parse({ text: "" })).toThrow();
    expect(() => stepSchema.parse({ text: "a".repeat(2001) })).toThrow();
  });
});

describe("recipeContentSchema", () => {
  it("accepts a minimal recipe and fills in every default", () => {
    const parsed = recipeContentSchema.parse(validRecipe());
    expect(parsed).toMatchObject({
      difficulty: "easy",
      prep_minutes: 0,
      cook_minutes: 0,
      servings: 2,
      tags: [],
      diet_tags: [],
    });
  });

  it("rejects an empty ingredients or steps array (DB check: length between 1 and 60 / 1 and 40)", () => {
    expect(() =>
      recipeContentSchema.parse(validRecipe({ ingredients: [] })),
    ).toThrow();
    expect(() => recipeContentSchema.parse(validRecipe({ steps: [] }))).toThrow();
  });

  it("rejects more than 60 ingredients or 40 steps", () => {
    expect(() =>
      recipeContentSchema.parse(
        validRecipe({ ingredients: Array(61).fill(validIngredient) }),
      ),
    ).toThrow();
    expect(() =>
      recipeContentSchema.parse(validRecipe({ steps: Array(41).fill(validStep) })),
    ).toThrow();
  });

  it("rejects a title over 140 chars or an empty title (DB column limit)", () => {
    expect(() => recipeContentSchema.parse(validRecipe({ title: "" }))).toThrow();
    expect(() =>
      recipeContentSchema.parse(validRecipe({ title: "a".repeat(141) })),
    ).toThrow();
  });

  it("rejects a summary over 400 chars (DB column limit)", () => {
    expect(() =>
      recipeContentSchema.parse(validRecipe({ summary: "a".repeat(401) })),
    ).toThrow();
  });

  it("rejects more than 20 tags or a duplicate-free diet_tags list with an invalid member", () => {
    expect(() =>
      recipeContentSchema.parse(validRecipe({ tags: Array(21).fill("x") })),
    ).toThrow();
    expect(() =>
      recipeContentSchema.parse(validRecipe({ diet_tags: ["carnivore"] })),
    ).toThrow();
  });

  it("round-trips a fully specified recipe unchanged", () => {
    const input = validRecipe({
      summary: "A quick, bright weeknight bowl.",
      cuisine: "Loosely Thai",
      difficulty: "medium",
      prep_minutes: 8,
      cook_minutes: 14,
      servings: 2,
      tags: ["quick", "one-pan"],
      diet_tags: ["dairy_free"],
    });
    expect(recipeContentSchema.parse(input)).toMatchObject(input);
  });
});
