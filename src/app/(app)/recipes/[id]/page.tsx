import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MealTag, Tag } from "@/components/ui/Tag";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { MEAL_LABELS, DIFFICULTY_LABELS } from "@/lib/ai/recipe-labels";
import { DIET_TAG_LABELS } from "@/lib/ai/diet-labels";
import { matchIngredientsToPantry, summarizePantryMatch } from "@/lib/recipes/pantry-match";
import type { Ingredient, Step } from "@/lib/ai/schema";
import { publicEnv } from "@/lib/env";
import { DeleteRecipeButton } from "./DeleteRecipeButton";
import { PrintButton } from "./PrintButton";
import { duplicateRecipeAction } from "./actions";

export default async function RecipeDetailPage(props: PageProps<"/recipes/[id]">) {
  const { id } = await props.params;
  const { supabase, user } = await requireUser();

  // Explicit owner filter, not just RLS: "recipes: owner select" and
  // "recipes: anyone can read fully-public recipes" are separate, OR'd
  // policies, so RLS alone would let this page render someone else's
  // *public* recipe — complete with the Edit/Duplicate/Delete controls
  // meant for the owner only — for any signed-in visitor who guesses or
  // is given its id. A mismatched owner and a typo'd id both correctly
  // read as "no row" this way, and both 404 identically, never a 403 that
  // would confirm the id belongs to *someone*.
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !recipe) notFound();

  const { data: pantryRows } = await supabase
    .from("pantry_items")
    .select("name")
    .eq("user_id", user.id)
    .eq("status", "have");

  const ingredients = recipe.ingredients as unknown as Ingredient[];
  const steps = recipe.steps as unknown as Step[];
  const pantryItems = (pantryRows ?? []).map((row) => ({ name: row.name }));
  const matches = matchIngredientsToPantry(ingredients, pantryItems);
  const pantryMatch = summarizePantryMatch(ingredients, pantryItems);
  const usesUp = matches.filter((m) => m.matched).map((m) => m.matchedPantryItemName as string);
  const totalMinutes = recipe.total_minutes ?? recipe.prep_minutes + recipe.cook_minutes;
  const shareUrl =
    recipe.visibility !== "private" && recipe.share_slug
      ? `${publicEnv.NEXT_PUBLIC_SITE_URL}/r/${recipe.share_slug}`
      : null;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <Link href={`/recipes/${recipe.id}/edit`} className={buttonClassName()}>
          Edit
        </Link>
        <button type="button" className={buttonClassName({ variant: "secondary" })} disabled title="Cook mode is coming in a later phase">
          Cook this now
        </button>
        <Link href="/week" className={buttonClassName({ variant: "secondary" })}>
          Add to a day
        </Link>
        <Link href="/recipes" className="ml-auto text-sm text-[color:var(--color-muted)] hover:text-accent-700">
          &larr; Back to recipes
        </Link>
      </div>

      <Card className="flex flex-col gap-5 bg-bg p-6">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              <MealTag mealType={recipe.meal_type}>{MEAL_LABELS[recipe.meal_type]}</MealTag>
              {recipe.diet_tags.map((tag) => (
                <Tag key={tag} variant="accent-2">
                  {DIET_TAG_LABELS[tag]}
                </Tag>
              ))}
              <Tag variant="neutral">
                {pantryMatch.isComplete
                  ? "Uses everything you have"
                  : `You have ${pantryMatch.matchedCount} of ${pantryMatch.requiredCount} things`}
              </Tag>
            </div>
            <h1 className="mb-1.5 text-[31px]">{recipe.title}</h1>
            {recipe.summary ? (
              <p className="max-w-lg text-sm text-[color:var(--color-muted)]">{recipe.summary}</p>
            ) : null}
          </div>
          <PhotoPlaceholder
            recipeId={recipe.id}
            mealType={recipe.meal_type}
            className="h-[140px] w-[200px] flex-none rounded-[24px]"
          />
        </div>

        <div className="flex flex-wrap gap-6 text-[13px] text-[color:var(--color-muted)]">
          <span>
            {totalMinutes} min · {recipe.prep_minutes} prep / {recipe.cook_minutes} cook
          </span>
          <span>Serves {recipe.servings}</span>
          <span>
            {DIFFICULTY_LABELS[recipe.difficulty]}
            {recipe.cuisine ? ` · ${recipe.cuisine}` : ""}
          </span>
        </div>

        {!pantryMatch.isComplete ? (
          <div className="rounded-[20px] bg-accent-2-100 p-3.5 text-xs text-accent-2-800">
            You&rsquo;re {pantryMatch.missing.length} short:{" "}
            {pantryMatch.missing.map((i) => i.name).join(", ")}.
          </div>
        ) : null}

        {usesUp.length > 0 ? (
          <div className="text-xs text-[color:var(--color-muted)]">
            Uses up: {usesUp.join(", ")}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-7">
          <div className="min-w-[230px] flex-1">
            <h6 className="mb-3 text-[color:var(--color-muted)]">Ingredients</h6>
            <div className="flex flex-col gap-2 text-sm">
              {matches.map((m, i) => (
                // pantry_key is a matching key, not a unique id -- two
                // ingredients can legitimately share one (e.g. "lime" and
                // a separately-added "limes", both normalizing the same
                // way), so it can't double as a React list key.
                <span key={i} className={m.matched ? "text-accent-700" : undefined}>
                  {m.matched ? "✓ " : ""}
                  {m.ingredient.quantity ? `${m.ingredient.quantity} ` : ""}
                  {m.ingredient.unit ? `${m.ingredient.unit} ` : ""}
                  {m.ingredient.name}
                  {m.ingredient.optional ? (
                    <span className="text-[color:var(--color-muted)]"> (optional)</span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
          <div className="min-w-[280px] flex-[1.3]">
            <h6 className="mb-3 text-[color:var(--color-muted)]">Method</h6>
            <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-relaxed">
              {steps.map((step, i) => (
                <li key={i}>
                  {step.text}
                  {step.timer_minutes ? (
                    <span className="ml-2 tag tag-neutral">{step.timer_minutes} min</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>

      {shareUrl ? (
        <Card className="gap-2">
          <div className="card-title">This recipe is shared</div>
          <p className="card-body">
            Anyone with this link can view it, {recipe.visibility === "public" ? "and it's also listed publicly." : "but it isn't listed anywhere."}
          </p>
          <code className="text-xs break-all text-accent-700">{shareUrl}</code>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <form action={duplicateRecipeAction.bind(null, recipe.id)}>
          <button type="submit" className={buttonClassName({ variant: "secondary" })}>
            Duplicate
          </button>
        </form>
        <PrintButton />
        <DeleteRecipeButton recipeId={recipe.id} />
      </div>
    </div>
  );
}
