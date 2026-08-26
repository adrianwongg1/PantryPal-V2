import { describe, expect, it } from "vitest";
import { editRecipeSchema } from "./edit-schema";

const VALID: Record<string, unknown> = {
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
  visibility: "private",
};

describe("editRecipeSchema", () => {
  it("accepts a full content payload plus visibility", () => {
    const result = editRecipeSchema.safeParse(VALID);
    expect(result.success).toBe(true);
  });

  it("rejects a visibility value outside the three allowed states", () => {
    const result = editRecipeSchema.safeParse({ ...VALID, visibility: "shared" });
    expect(result.success).toBe(false);
  });

  it("requires visibility — it's not optional on the edit form", () => {
    const withoutVisibility = { ...VALID };
    delete withoutVisibility.visibility;
    const result = editRecipeSchema.safeParse(withoutVisibility);
    expect(result.success).toBe(false);
  });

  it("still enforces every recipeContentSchema rule (e.g. at least one ingredient)", () => {
    const result = editRecipeSchema.safeParse({ ...VALID, ingredients: [] });
    expect(result.success).toBe(false);
  });
});
