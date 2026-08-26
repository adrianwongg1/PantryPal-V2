"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import {
  difficultySchema,
  mealTypeSchema,
  recipeContentSchema,
  type RecipeContent,
} from "@/lib/ai/schema";
import {
  generateRecipe,
  generateWithProvider,
  type ModelProvider,
} from "@/lib/ai/generate";
import { checkGenerationRateLimit, recordGenerationEvent } from "@/lib/ai/rate-limit";
import { summarizePantryMatch, type PantryMatchSummary } from "@/lib/recipes/pantry-match";
import { generateShareSlug } from "@/lib/share/slug";

// hasAnthropicFallback is a plain value, not a Server Action — "use server"
// files may only export async functions, so the page imports it directly
// from lib/ai/generate instead of through here.

export type GenerateActionState =
  | { status: "idle" }
  | {
      status: "result";
      recipe: RecipeContent;
      provider: ModelProvider;
      pantryMatch: PantryMatchSummary;
    }
  | { status: "error"; message: string };

const generateFormSchema = z.object({
  freeText: z.string().min(1, "Tell PantryPal what you have first."),
  servings: z.coerce.number().int().min(1).max(12),
  maxMinutes: z.coerce.number().int().min(10).max(90),
  difficulty: difficultySchema,
  mealType: mealTypeSchema,
  provider: z.enum(["groq", "anthropic"]).optional(),
});

export async function generateRecipeAction(
  _prevState: GenerateActionState,
  formData: FormData,
): Promise<GenerateActionState> {
  const { supabase, user } = await requireUser();

  const parsed = generateFormSchema.safeParse({
    freeText: formData.get("freeText"),
    servings: formData.get("servings"),
    maxMinutes: formData.get("maxMinutes"),
    difficulty: formData.get("difficulty"),
    mealType: formData.get("mealType"),
    provider: formData.get("provider") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check that form and try again." };
  }

  const rateLimit = await checkGenerationRateLimit(supabase, user.id);
  if (rateLimit.limited) {
    return {
      status: "error",
      message: `That's a lot of requests — try again in about ${rateLimit.retryAfterMinutes} minutes.`,
    };
  }

  const { data: preferences, error: prefsError } = await supabase
    .from("user_preferences")
    .select("diets, allergies, disliked_ingredients, preferred_cuisines, spice_level")
    .eq("user_id", user.id)
    .single();
  if (prefsError) {
    return { status: "error", message: "Couldn't load your preferences — try again." };
  }

  const { data: pantryRows, error: pantryError } = await supabase
    .from("pantry_items")
    .select("name")
    .eq("user_id", user.id)
    .eq("status", "have");
  if (pantryError) {
    return { status: "error", message: "Couldn't load your pantry — try again." };
  }

  const input = {
    freeText: parsed.data.freeText,
    servings: parsed.data.servings,
    maxMinutes: parsed.data.maxMinutes,
    difficulty: parsed.data.difficulty,
    mealType: parsed.data.mealType,
    preferences: {
      diets: preferences.diets,
      allergies: preferences.allergies,
      dislikedIngredients: preferences.disliked_ingredients,
      preferredCuisines: preferences.preferred_cuisines,
      spiceLevel: preferences.spice_level,
    },
    pantryItems: pantryRows.map((row) => row.name),
  };
  // Reused as-is for the match summary below — pantryRows is already
  // scoped to status: "have" by the query above.
  const pantryItemsForMatch = pantryRows.map((row) => ({ name: row.name }));

  const result = parsed.data.provider
    ? await generateWithProvider(input, parsed.data.provider)
    : await generateRecipe(input);

  await recordGenerationEvent(
    supabase,
    user.id,
    result.ok ? result.provider : (parsed.data.provider ?? "groq"),
    result.ok,
  );

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  const pantryMatch = summarizePantryMatch(result.recipe.ingredients, pantryItemsForMatch);

  return { status: "result", recipe: result.recipe, provider: result.provider, pantryMatch };
}

export async function saveRecipeAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();

  const raw = formData.get("recipe");
  const model = formData.get("model");
  if (typeof raw !== "string") {
    throw new Error("Missing recipe data");
  }

  const parsed = recipeContentSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error("Generated recipe failed validation on save");
  }

  // Phase 7's Settings page lets a user set a default visibility for new
  // recipes — honored here, the one place a recipe is actually created
  // from scratch (the edit form's own visibility control only ever
  // changes an existing row, never sets the initial value). A slug is
  // generated up front whenever that default isn't 'private', same as
  // the edit action does the first time a recipe leaves private.
  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("default_visibility")
    .eq("user_id", user.id)
    .single();
  const visibility = preferences?.default_visibility ?? "private";

  const { error } = await supabase.from("recipes").insert({
    user_id: user.id,
    title: parsed.data.title,
    summary: parsed.data.summary,
    meal_type: parsed.data.meal_type,
    cuisine: parsed.data.cuisine,
    difficulty: parsed.data.difficulty,
    prep_minutes: parsed.data.prep_minutes,
    cook_minutes: parsed.data.cook_minutes,
    servings: parsed.data.servings,
    ingredients: parsed.data.ingredients,
    steps: parsed.data.steps,
    tags: parsed.data.tags,
    diet_tags: parsed.data.diet_tags,
    source: "generated",
    model: typeof model === "string" ? model : null,
    visibility,
    share_slug: visibility !== "private" ? generateShareSlug() : null,
  });

  if (error) {
    throw error;
  }

  redirect("/recipes");
}
