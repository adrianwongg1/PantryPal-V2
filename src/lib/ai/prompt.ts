import type { DietTag, Difficulty, MealType, RecipeContent } from "./schema";
import { DIET_TAG_LABELS } from "./diet-labels";
import { SPICE_LABELS } from "./recipe-labels";

export type GenerateRecipeInput = {
  freeText: string;
  servings: number;
  maxMinutes: number;
  difficulty: Difficulty;
  mealType: MealType;
  preferences: {
    diets: DietTag[];
    allergies: string[];
    dislikedIngredients: string[];
    preferredCuisines: string[];
    /** 0 (none) - 3 (punishing), matches user_preferences.spice_level. */
    spiceLevel: number;
  };
  /** Names of pantry_items the user currently has (status: "have"). */
  pantryItems: string[];
};

// Shared between the initial-generation prompt and the rewrite prompt
// (buildRewritePrompt, below) — both need the model to emit the same
// pantry_key/optional shape, so both build their system prompt from these
// rather than drifting apart over time.
const PANTRY_KEY_INSTRUCTION = [
  "For every ingredient you list, also give a short canonical `pantry_key`",
  "(e.g. \"chicken breast\", \"lime\", \"soy sauce\") separate from the",
  "human-readable `name` — this is used to match ingredients against a",
  "user's pantry later, so keep it a plain, singular, lowercase noun phrase",
  "with no quantity, brand, or preparation detail in it.",
].join("\n");

const OPTIONAL_INSTRUCTION = [
  "Mark an ingredient `optional: true` only if the recipe is genuinely",
  "fine without it (a garnish, an optional heat boost) — not for anything",
  "load-bearing to the dish. The `optional` field is how the app marks an",
  "ingredient as optional in its own UI — never write \"(optional)\" or",
  "similar into the ingredient's `name` itself, even when `optional` is",
  "true; the name should read the same whether or not the ingredient",
  "happens to be optional.",
].join("\n");

// Preferences are hard constraints, never suggestions — matches the design
// canvas's own framing of Preferences ("These are never suggestions...
// passed to every recipe as a rule it isn't allowed to break") and
// user_preferences' own doc comment on `allergies`. Allergies specifically
// are stated as prohibitions the model must refuse to violate, not as
// dislikes to weigh — the two live in very different parts of the prompt
// on purpose. Pantry contents are framed as "available", not required —
// the model should use them where sensible, not force every one of them
// into the recipe.
export function buildRecipePrompt(input: GenerateRecipeInput): {
  system: string;
  prompt: string;
} {
  const { preferences } = input;

  const constraintLines: string[] = [];

  if (preferences.diets.length > 0) {
    const dietLabels = preferences.diets.map((d) => DIET_TAG_LABELS[d]).join(", ");
    constraintLines.push(
      `The recipe MUST comply with every one of these diets: ${dietLabels}. This is not optional.`,
    );
  }

  if (preferences.allergies.length > 0) {
    constraintLines.push(
      `The user is ALLERGIC to: ${preferences.allergies.join(", ")}. Do not include ` +
        `any of these ingredients, or any ingredient derived from them, under any ` +
        `circumstance. This is a safety requirement, not a preference.`,
    );
  }

  if (preferences.dislikedIngredients.length > 0) {
    constraintLines.push(
      `The user would rather not eat: ${preferences.dislikedIngredients.join(", ")}. ` +
        `Avoid these where reasonably possible.`,
    );
  }

  if (preferences.preferredCuisines.length > 0) {
    constraintLines.push(
      `The user leans toward these cuisines when it fits: ${preferences.preferredCuisines.join(", ")}.`,
    );
  }

  constraintLines.push(
    `Spice level: ${SPICE_LABELS[preferences.spiceLevel] ?? SPICE_LABELS[0]}.`,
  );

  const system = [
    "You are PantryPal's recipe generator. You turn a description of what's",
    "in someone's kitchen into a single cookable recipe.",
    "",
    "Hard constraints — the recipe is invalid if it violates any of these:",
    ...constraintLines.map((line) => `- ${line}`),
    "",
    PANTRY_KEY_INSTRUCTION,
    "",
    OPTIONAL_INSTRUCTION,
  ].join("\n");

  const promptLines = [
    `What's available: ${input.freeText.trim()}`,
  ];

  if (input.pantryItems.length > 0) {
    promptLines.push(
      `Also available in the pantry, free to use if it fits: ${input.pantryItems.join(", ")}.`,
    );
  }

  promptLines.push(
    `Meal: ${input.mealType}.`,
    `Effort level: ${input.difficulty}.`,
    `Total time (prep + cook) must not exceed ${input.maxMinutes} minutes.`,
    `Servings: ${input.servings}.`,
  );

  return { system, prompt: promptLines.join("\n") };
}

// Backs the edit form's "Ask for a rewrite" chips (Phase 6) — a second AI
// call against a recipe the user is already editing, not a fresh
// generation. Deliberately asks for the FULL recipe back, not a diff:
// recipeContentSchema is the same one-shot structured-output contract
// either way, and having the model return a partial object would need a
// merge step this app doesn't otherwise have anywhere.
export function buildRewritePrompt(
  current: RecipeContent,
  instruction: string,
): { system: string; prompt: string } {
  const system = [
    "You are PantryPal's recipe generator, now revising a recipe the user",
    "already has saved, per their request below. Return the complete",
    "recipe again in the same shape — every field, including ones you",
    "don't change, not a diff.",
    "",
    "Keep each ingredient's `pantry_key` identical to the current recipe's",
    "whenever that ingredient itself is unchanged — it drives pantry",
    "matching, and changing it without reason breaks that match for",
    "something the user never asked to change.",
    "",
    PANTRY_KEY_INSTRUCTION,
    "",
    OPTIONAL_INSTRUCTION,
  ].join("\n");

  const prompt = [
    `Current recipe, as JSON: ${JSON.stringify(current)}`,
    "",
    `Requested change: ${instruction}`,
  ].join("\n");

  return { system, prompt };
}
