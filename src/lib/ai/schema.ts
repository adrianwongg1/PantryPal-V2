import { z } from "zod";

// The one Zod contract validating recipe content at all three boundaries
// CLAUDE.md promises: AI output (lib/ai/generate.ts, Phase 5), the DB row
// (recipes.ingredients / recipes.steps, both jsonb), and the edit form
// (Phase 6). Field limits mirror the CHECK constraints in
// supabase/migrations/20260813000300_recipes.sql exactly, so a value valid
// here is guaranteed valid there — divergence between the two is the bug
// class this file exists to prevent.

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
] as const;
export const mealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof mealTypeSchema>;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const difficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof difficultySchema>;

// Matches public.diet_tag exactly (supabase/migrations/20260813000100_extensions_and_enums.sql).
export const DIET_TAGS = [
  "vegetarian",
  "vegan",
  "pescatarian",
  "halal",
  "kosher",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "low_carb",
  "keto",
  "paleo",
  "low_sodium",
] as const;
export const dietTagSchema = z.enum(DIET_TAGS);
export type DietTag = z.infer<typeof dietTagSchema>;

export const ingredientSchema = z.object({
  name: z.string().min(1).max(120),
  // Canonical matching key ("chicken breast", not "Cooked chicken,
  // shredded, ~250g"). The model is asked to emit this alongside the
  // human-readable name specifically so lib/recipes/pantry-match.ts never
  // has to guess two ingredients are the same thing from free text — see
  // that file for why naive string matching fails here.
  pantry_key: z.string().min(1).max(80),
  quantity: z.number().positive().max(10_000).optional(),
  unit: z.string().max(20).optional(),
  // Doesn't drive the "you're N short" warning or the pantry-match
  // completeness count (see summarizePantryMatch) — still shown in the UI,
  // just not counted against the recipe being cookable.
  optional: z.boolean().default(false),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

export const stepSchema = z.object({
  text: z.string().min(1).max(2000),
  // Minutes, not seconds — matches the design's own step-timer copy
  // ("3:12 of 4 minutes"). Absent when a step has no natural timer.
  timer_minutes: z.number().int().positive().max(600).optional(),
});
export type Step = z.infer<typeof stepSchema>;

// The editable/generatable content of a recipe — title through diet_tags.
// Deliberately excludes columns the app manages separately and that AI
// never produces: id, user_id, source, model, visibility/share_slug
// (Phase 6's sharing flow), cooked_count/last_cooked_at (cook history),
// notes (a free-text field edited on its own, not part of generation),
// timestamps.
export const recipeContentSchema = z.object({
  title: z.string().min(1).max(140),
  summary: z.string().max(400).optional(),
  meal_type: mealTypeSchema,
  cuisine: z.string().max(40).optional(),
  difficulty: difficultySchema.default("easy"),
  prep_minutes: z.number().int().min(0).max(1440).default(0),
  cook_minutes: z.number().int().min(0).max(1440).default(0),
  servings: z.number().int().min(1).max(50).default(2),
  // DB check: jsonb_array_length between 1 and 60 (recipes.ingredients).
  // Note the column's own '[]'::jsonb default fails that same check — the
  // default is effectively unreachable and every insert must supply a
  // real array. Harmless in practice: generation always produces >=1
  // ingredient, and this schema's own min(1) makes that the only value
  // that ever reaches the DB anyway.
  ingredients: z.array(ingredientSchema).min(1).max(60),
  // DB check: jsonb_array_length between 1 and 40 (recipes.steps).
  steps: z.array(stepSchema).min(1).max(40),
  tags: z.array(z.string().max(40)).max(20).default([]),
  diet_tags: z.array(dietTagSchema).default([]),
});
export type RecipeContent = z.infer<typeof recipeContentSchema>;
