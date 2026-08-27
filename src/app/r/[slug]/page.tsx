import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { MealTag } from "@/components/ui/Tag";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";
import { MEAL_LABELS, DIFFICULTY_LABELS } from "@/lib/ai/recipe-labels";
import type { Ingredient, Step } from "@/lib/ai/schema";

// Public — no auth, no AppShell. Reads exclusively through
// get_shared_recipe() (see the migration's own comment on why: a table
// policy scoped to visibility in ('public','unlisted') would let anyone
// enumerate every unlisted link through PostgREST). A private recipe's
// slug (there isn't one, by the share_slug_required_when_shared check) or
// a slug that's never existed both 404 identically — no distinction that
// would let a visitor probe for valid-but-private links.
async function getSharedRecipe(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_recipe", { p_slug: slug });
  return data?.[0] ?? null;
}

export async function generateMetadata(
  props: PageProps<"/r/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const recipe = await getSharedRecipe(slug);
  if (!recipe) return { title: "Recipe not found" };
  return {
    title: recipe.title,
    description: recipe.summary ?? `A ${recipe.meal_type} recipe on PantryPal.`,
  };
}

export default async function SharedRecipePage(props: PageProps<"/r/[slug]">) {
  const { slug } = await props.params;
  const recipe = await getSharedRecipe(slug);
  if (!recipe) notFound();

  const ingredients = recipe.ingredients as unknown as Ingredient[];
  const steps = recipe.steps as unknown as Step[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-heading">
          <Logo size={24} />
          PantryPal
        </Link>
        <Link href="/signup" className={buttonClassName({ variant: "secondary" })}>
          Make your own
        </Link>
      </div>

      <Card className="flex flex-col gap-5 bg-bg p-6">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <MealTag mealType={recipe.meal_type} className="mb-2.5">
              {MEAL_LABELS[recipe.meal_type]}
            </MealTag>
            <h1 className="mb-1.5 text-[31px]">{recipe.title}</h1>
            {recipe.summary ? (
              <p className="max-w-lg text-sm text-[color:var(--color-muted)]">{recipe.summary}</p>
            ) : null}
            <p className="mt-2 text-xs text-[color:var(--color-muted)]">
              by {recipe.author_display_name || recipe.author_username}
            </p>
          </div>
          <PhotoPlaceholder
            recipeId={recipe.id}
            mealType={recipe.meal_type}
            className="h-[140px] w-[200px] flex-none rounded-[24px]"
          />
        </div>

        <div className="flex flex-wrap gap-6 text-[13px] text-[color:var(--color-muted)]">
          <span>
            {recipe.total_minutes} min · {recipe.prep_minutes} prep / {recipe.cook_minutes} cook
          </span>
          <span>Serves {recipe.servings}</span>
          <span>
            {DIFFICULTY_LABELS[recipe.difficulty]}
            {recipe.cuisine ? ` · ${recipe.cuisine}` : ""}
          </span>
        </div>

        <div className="flex flex-wrap gap-7">
          <div className="min-w-[230px] flex-1">
            <h6 className="mb-3 text-[color:var(--color-muted)]">Ingredients</h6>
            <div className="flex flex-col gap-2 text-sm">
              {ingredients.map((ingredient, i) => (
                // pantry_key is a matching key, not a unique id -- two
                // ingredients can legitimately share one (e.g. "lime" and
                // a separately-added "limes", which normalize to the same
                // key) -- confirmed live via a real "two children with the
                // same key" React warning before switching to index.
                <span key={i}>
                  {ingredient.quantity ? `${ingredient.quantity} ` : ""}
                  {ingredient.unit ? `${ingredient.unit} ` : ""}
                  {ingredient.name}
                  {ingredient.optional ? (
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
    </div>
  );
}
