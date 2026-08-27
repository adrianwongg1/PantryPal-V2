import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { EditRecipeValues } from "@/lib/recipes/edit-schema";
import type { Ingredient, Step } from "@/lib/ai/schema";
import { EditForm } from "./EditForm";

export default async function EditRecipePage(props: PageProps<"/recipes/[id]/edit">) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !recipe) notFound();

  const defaultValues: EditRecipeValues = {
    title: recipe.title,
    summary: recipe.summary ?? undefined,
    meal_type: recipe.meal_type,
    cuisine: recipe.cuisine ?? undefined,
    difficulty: recipe.difficulty,
    prep_minutes: recipe.prep_minutes,
    cook_minutes: recipe.cook_minutes,
    servings: recipe.servings,
    ingredients: recipe.ingredients as unknown as Ingredient[],
    steps: recipe.steps as unknown as Step[],
    tags: recipe.tags,
    diet_tags: recipe.diet_tags,
    visibility: recipe.visibility,
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl">Edit recipe</h1>
      <EditForm
        recipeId={recipe.id}
        defaultValues={defaultValues}
        shareSlug={recipe.share_slug}
      />
    </div>
  );
}
