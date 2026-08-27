"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { editRecipeSchema, type EditRecipeValues } from "@/lib/recipes/edit-schema";
import { recipeContentSchema, type RecipeContent } from "@/lib/ai/schema";
import { rewriteRecipe } from "@/lib/ai/generate";
import { generateShareSlug } from "@/lib/share/slug";

export type UpdateRecipeResult = { ok: true } | { ok: false; error: string };

// Called directly from the client (EditForm's handleSubmit), not through a
// <form action>/FormData — RHF already has the validated values as a plain
// object, and Server Actions accept serializable JS args from a direct
// call just as well as from a form. Still re-validated here regardless of
// the client's own zodResolver pass, same as every other write path in
// this app: the client is never trusted alone.
export async function updateRecipeAction(
  recipeId: string,
  values: EditRecipeValues,
): Promise<UpdateRecipeResult> {
  const { supabase, user } = await requireUser();

  const parsed = editRecipeSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("recipes")
    .select("share_slug")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .single();
  if (fetchError || !existing) {
    return { ok: false, error: "Recipe not found." };
  }

  // A slug is generated the first time a recipe leaves 'private' and never
  // regenerated after — switching back to private and re-sharing later
  // reuses the same link rather than silently issuing a new one (the plan's
  // own stated rule, matching share_slug_required_when_shared's intent).
  const shareSlug =
    parsed.data.visibility !== "private" && !existing.share_slug
      ? generateShareSlug()
      : existing.share_slug;

  const { error } = await supabase
    .from("recipes")
    .update({
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
      visibility: parsed.data.visibility,
      share_slug: shareSlug,
    })
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "Couldn't save changes — try again." };
  }

  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

export type RewriteResult =
  | { ok: true; recipe: RecipeContent }
  | { ok: false; error: string };

// Backs "Ask for a rewrite" — a second AI call against whatever the user
// currently has in the form (not the original saved row), so asking for a
// rewrite after already editing a few fields doesn't discard that work.
// Never writes to the database itself; the result just replaces the form's
// values, same as any other edit, and still needs an explicit Save.
export async function rewriteRecipeAction(
  current: RecipeContent,
  instruction: string,
): Promise<RewriteResult> {
  await requireUser();

  const parsedCurrent = recipeContentSchema.safeParse(current);
  if (!parsedCurrent.success) {
    return { ok: false, error: "Couldn't read the current recipe." };
  }

  const result = await rewriteRecipe(parsedCurrent.data, instruction);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, recipe: result.recipe };
}
