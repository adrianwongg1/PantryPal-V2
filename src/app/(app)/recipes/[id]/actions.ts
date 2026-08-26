"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { recipeContentSchema } from "@/lib/ai/schema";

export async function deleteRecipeAction(recipeId: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/recipes");
  redirect("/recipes");
}

// Copies title through diet_tags (recipeContentSchema's own fields) plus
// notes — everything a fresh "manual" recipe needs. Deliberately drops
// visibility/share_slug (a duplicate starts private, never inheriting the
// original's public link) and cook history (cooked_count/last_cooked_at —
// a duplicate hasn't been cooked yet).
export async function duplicateRecipeAction(recipeId: string): Promise<void> {
  const { supabase, user } = await requireUser();

  // .eq("user_id", ...) here too, not just RLS -- see the detail page's
  // own comment on why "owner select" alone isn't enough on this table.
  const { data: original, error: fetchError } = await supabase
    .from("recipes")
    .select(
      "title, summary, meal_type, cuisine, difficulty, prep_minutes, cook_minutes, servings, ingredients, steps, tags, diet_tags",
    )
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) throw fetchError ?? new Error("Recipe not found");

  // Re-validated through the same content contract as generation/save,
  // same as every other write path in this app — never trust a prior row
  // was written by code that's still correct today.
  const parsed = recipeContentSchema.parse({
    title: `${original.title} (copy)`,
    summary: original.summary ?? undefined,
    meal_type: original.meal_type,
    cuisine: original.cuisine ?? undefined,
    difficulty: original.difficulty,
    prep_minutes: original.prep_minutes,
    cook_minutes: original.cook_minutes,
    servings: original.servings,
    ingredients: original.ingredients,
    steps: original.steps,
    tags: original.tags,
    diet_tags: original.diet_tags,
  });

  const { data: inserted, error: insertError } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      title: parsed.title,
      summary: parsed.summary,
      meal_type: parsed.meal_type,
      cuisine: parsed.cuisine,
      difficulty: parsed.difficulty,
      prep_minutes: parsed.prep_minutes,
      cook_minutes: parsed.cook_minutes,
      servings: parsed.servings,
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      tags: parsed.tags,
      diet_tags: parsed.diet_tags,
      source: "manual",
    })
    .select("id")
    .single();

  if (insertError || !inserted) throw insertError ?? new Error("Duplicate failed");

  revalidatePath("/recipes");
  redirect(`/recipes/${inserted.id}/edit`);
}
