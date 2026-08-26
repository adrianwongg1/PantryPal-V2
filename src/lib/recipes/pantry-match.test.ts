import { describe, expect, it } from "vitest";
import type { Ingredient } from "@/lib/ai/schema";
import {
  matchIngredientsToPantry,
  normalizePantryKey,
  pantryKeysMatch,
  summarizePantryMatch,
} from "./pantry-match";

function ingredient(overrides: Partial<Ingredient> & { pantry_key: string }): Ingredient {
  return { name: overrides.pantry_key, optional: false, ...overrides };
}

describe("normalizePantryKey", () => {
  it("lowercases and trims", () => {
    expect(normalizePantryKey("  Lime  ")).toBe("lime");
  });

  it("folds regular plurals", () => {
    expect(normalizePantryKey("limes")).toBe(normalizePantryKey("lime"));
    expect(normalizePantryKey("onions")).toBe(normalizePantryKey("onion"));
    expect(normalizePantryKey("eggs")).toBe(normalizePantryKey("egg"));
  });

  it("folds -oes plurals (tomatoes, potatoes)", () => {
    expect(normalizePantryKey("tomatoes")).toBe(normalizePantryKey("tomato"));
    expect(normalizePantryKey("potatoes")).toBe(normalizePantryKey("potato"));
  });

  it("folds -ies plurals", () => {
    expect(normalizePantryKey("berries")).toBe(normalizePantryKey("berry"));
  });

  it("does not mangle words ending in -ss or -us (not plurals)", () => {
    expect(normalizePantryKey("watercress")).toBe("watercress");
    expect(normalizePantryKey("couscous")).toBe("couscous");
    expect(normalizePantryKey("hummus")).toBe("hummus");
  });

  it("strips accents", () => {
    expect(normalizePantryKey("jalapeño")).toBe(normalizePantryKey("jalapeno"));
  });

  it("strips punctuation and collapses whitespace/hyphens", () => {
    expect(normalizePantryKey("Rotisserie chicken, shredded!")).toBe(
      "rotisserie chicken shredded",
    );
    expect(normalizePantryKey("all-purpose flour")).toBe(
      normalizePantryKey("all purpose flour"),
    );
  });

  it("maps known aliases to the same canonical key", () => {
    expect(normalizePantryKey("cilantro")).toBe(normalizePantryKey("coriander"));
    expect(normalizePantryKey("scallion")).toBe(normalizePantryKey("spring onion"));
    expect(normalizePantryKey("green onion")).toBe(normalizePantryKey("spring onion"));
    expect(normalizePantryKey("courgette")).toBe(normalizePantryKey("zucchini"));
  });
});

describe("pantryKeysMatch", () => {
  it("matches through normalization and aliasing", () => {
    expect(pantryKeysMatch("Cilantro", "Coriander")).toBe(true);
    expect(pantryKeysMatch("Limes", "lime")).toBe(true);
  });

  it("matches a canonical key against a more descriptive pantry name (either direction)", () => {
    // The exact case this module exists for: an exact-equality match would
    // require "chicken" to equal "rotisserie chicken" outright.
    expect(pantryKeysMatch("chicken", "Rotisserie chicken")).toBe(true);
    expect(pantryKeysMatch("Cilantro", "coriander leaves")).toBe(true);
  });

  it("does not match a short key that only appears as part of a longer word", () => {
    // The false-positive a raw (non-word-bounded) substring test would
    // produce: "egg" is not "eggplant".
    expect(pantryKeysMatch("egg", "eggplant")).toBe(false);
  });
});

describe("matchIngredientsToPantry", () => {
  const ingredients: Ingredient[] = [
    ingredient({ name: "Cooked chicken, shredded", pantry_key: "chicken" }),
    ingredient({ name: "Cold cooked rice", pantry_key: "rice" }),
    ingredient({ name: "Honey", pantry_key: "honey", optional: true }),
    ingredient({ name: "Coriander", pantry_key: "coriander" }),
  ];

  it("matches an ingredient whose pantry_key differs in wording from the pantry item name", () => {
    const result = matchIngredientsToPantry(ingredients, [
      { name: "Rotisserie chicken" },
      { name: "Rice, jasmine" },
    ]);
    expect(result.find((m) => m.ingredient.pantry_key === "chicken")?.matched).toBe(
      true,
    );
    expect(result.find((m) => m.ingredient.pantry_key === "rice")?.matched).toBe(true);
  });

  it("matches through the alias table", () => {
    const result = matchIngredientsToPantry(ingredients, [{ name: "Cilantro" }]);
    expect(result.find((m) => m.ingredient.pantry_key === "coriander")?.matched).toBe(
      true,
    );
  });

  it("does not match a pantry item with status 'need' (not yet bought)", () => {
    const result = matchIngredientsToPantry(ingredients, [
      { name: "Chicken", status: "need" },
    ]);
    expect(result.find((m) => m.ingredient.pantry_key === "chicken")?.matched).toBe(
      false,
    );
  });

  it("reports which pantry item name satisfied the match", () => {
    const result = matchIngredientsToPantry(ingredients, [
      { name: "Rotisserie chicken" },
    ]);
    expect(
      result.find((m) => m.ingredient.pantry_key === "chicken")?.matchedPantryItemName,
    ).toBe("Rotisserie chicken");
  });

  it("leaves an ingredient unmatched when nothing in the pantry corresponds", () => {
    const result = matchIngredientsToPantry(ingredients, []);
    expect(result.every((m) => !m.matched)).toBe(true);
  });
});

describe("summarizePantryMatch", () => {
  const ingredients: Ingredient[] = [
    ingredient({ name: "Chicken", pantry_key: "chicken" }),
    ingredient({ name: "Rice", pantry_key: "rice" }),
    ingredient({ name: "Lime", pantry_key: "lime" }),
    ingredient({ name: "Spring onions", pantry_key: "spring onion" }),
    ingredient({ name: "Sriracha", pantry_key: "sriracha" }),
    ingredient({ name: "Honey", pantry_key: "honey", optional: true }),
    ingredient({ name: "Coriander", pantry_key: "coriander", optional: true }),
  ];
  const pantry = [
    { name: "Cold cooked rice" },
    { name: "Cooked chicken, shredded" },
    { name: "Limes" },
    { name: "Sriracha" },
    { name: "Scallions" }, // aliases to "spring onion"
  ];

  it("matches the design canvas's own '5 of 7 in your pantry' example", () => {
    const summary = summarizePantryMatch(ingredients, pantry);
    // 5 required (honey and coriander are optional, excluded), all 5 present.
    expect(summary.requiredCount).toBe(5);
    expect(summary.matchedCount).toBe(5);
    expect(summary.isComplete).toBe(true);
    expect(summary.missing).toHaveLength(0);
  });

  it("reports 'two short' when two required ingredients are missing (1c/7a)", () => {
    const summary = summarizePantryMatch(ingredients, [
      { name: "Cold cooked rice" },
      { name: "Cooked chicken, shredded" },
      { name: "Limes" },
    ]);
    expect(summary.requiredCount).toBe(5);
    expect(summary.matchedCount).toBe(3);
    expect(summary.isComplete).toBe(false);
    expect(summary.missing.map((i) => i.pantry_key).sort()).toEqual(
      ["spring onion", "sriracha"].sort(),
    );
  });

  it("never lets a missing optional ingredient break completeness", () => {
    const summary = summarizePantryMatch(ingredients, [
      { name: "Cold cooked rice" },
      { name: "Cooked chicken, shredded" },
      { name: "Limes" },
      { name: "Sriracha" },
      { name: "Scallions" },
      // honey and coriander (both optional) deliberately absent
    ]);
    expect(summary.isComplete).toBe(true);
  });
});
