import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MealTag, Tag } from "@/components/ui/Tag";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { MEAL_TYPES, type MealType } from "@/lib/ai/schema";
import { MEAL_LABELS } from "@/lib/ai/recipe-labels";
import { DIET_TAG_LABELS } from "@/lib/ai/diet-labels";

const SORTS = ["recent", "az", "quick"] as const;
type Sort = (typeof SORTS)[number];
const SORT_LABELS: Record<Sort, string> = {
  recent: "Recent",
  az: "A–Z",
  quick: "Quickest",
};

function isMealType(value: string | undefined): value is MealType {
  return !!value && (MEAL_TYPES as readonly string[]).includes(value);
}

function isSort(value: string | undefined): value is Sort {
  return !!value && (SORTS as readonly string[]).includes(value);
}

// Builds the href for a filter/sort link, keeping every other active
// param and toggling just this one — clicking an already-active meal chip
// clears it instead of being a no-op.
function filterHref(
  current: { q?: string; meal?: string; sort?: string },
  patch: { meal?: string | null; sort?: string | null },
): string {
  const params = new URLSearchParams();
  if (current.q) params.set("q", current.q);
  const meal = patch.meal === null ? undefined : (patch.meal ?? current.meal);
  const sort = patch.sort === null ? undefined : (patch.sort ?? current.sort);
  if (meal) params.set("meal", meal);
  if (sort && sort !== "recent") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/recipes?${qs}` : "/recipes";
}

export default async function RecipesPage(props: PageProps<"/recipes">) {
  const { supabase, user } = await requireUser();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const meal = isMealType(typeof sp.meal === "string" ? sp.meal : undefined)
    ? (sp.meal as MealType)
    : undefined;
  const sort = isSort(typeof sp.sort === "string" ? sp.sort : undefined)
    ? (sp.sort as Sort)
    : "recent";

  // Explicit owner filter, not just RLS: the "recipes: owner select" and
  // "recipes: anyone can read fully-public recipes" policies are OR'd
  // together (Postgres RLS policies are permissive-by-default), so RLS
  // alone would let this query return other users' public recipes mixed
  // into "Your recipes" — confirmed live in Phase 6 with a real second
  // account seeing a public recipe it didn't own on its own library page.
  let query = supabase
    .from("recipes")
    .select(
      "id, title, meal_type, difficulty, prep_minutes, cook_minutes, total_minutes, servings, diet_tags, created_at",
    )
    .eq("user_id", user.id);

  if (q) query = query.ilike("title", `%${q}%`);
  if (meal) query = query.eq("meal_type", meal);

  if (sort === "az") {
    query = query.order("title", { ascending: true });
  } else if (sort === "quick") {
    query = query.order("total_minutes", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: recipes, error } = await query;
  if (error) throw error;

  const { count: totalCount } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasAnyRecipes = (totalCount ?? 0) > 0;
  const current = { q, meal, sort };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Your recipes</h1>
        <Link href="/generate" className={buttonClassName()}>
          Make something new
        </Link>
      </div>

      {hasAnyRecipes ? (
        <>
          <form action="/recipes" method="GET" className="flex flex-wrap items-center gap-3">
            {meal ? <input type="hidden" name="meal" value={meal} /> : null}
            {sort !== "recent" ? <input type="hidden" name="sort" value={sort} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search your recipes…"
              className="input min-w-[220px] flex-1 max-w-sm"
            />
            <button type="submit" className={buttonClassName({ variant: "secondary" })}>
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((mt) => (
                <Link
                  key={mt}
                  href={filterHref(current, { meal: meal === mt ? null : mt })}
                  className={`tag ${meal === mt ? "tag-accent" : "tag-outline"}`}
                >
                  {MEAL_LABELS[mt]}
                </Link>
              ))}
            </div>
            <div className="flex gap-2 text-xs">
              {SORTS.map((s) => (
                <Link
                  key={s}
                  href={filterHref(current, { sort: s })}
                  className={
                    sort === s
                      ? "text-accent-700 underline"
                      : "text-[color:var(--color-muted)] hover:text-accent-700"
                  }
                >
                  {SORT_LABELS[s]}
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {recipes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 border border-dashed border-[color:var(--color-divider)] py-24 text-center">
          {hasAnyRecipes ? (
            <>
              <p className="text-base">No recipes match.</p>
              <p className="text-sm text-[color:var(--color-muted)]">
                Try a different search or <Link href="/recipes" className="underline">clear your filters</Link>.
              </p>
            </>
          ) : (
            <>
              <p className="text-base">No recipes yet.</p>
              <p className="text-sm text-[color:var(--color-muted)]">
                Head to Generate and tell PantryPal what&rsquo;s in your kitchen —
                recipes you save show up here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <Card className="h-full gap-3 p-0 overflow-hidden">
                <PhotoPlaceholder
                  recipeId={recipe.id}
                  mealType={recipe.meal_type}
                  className="h-[120px] w-full"
                />
                <div className="flex flex-col gap-2 p-4 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    <MealTag mealType={recipe.meal_type}>{MEAL_LABELS[recipe.meal_type]}</MealTag>
                    {recipe.diet_tags.slice(0, 2).map((tag) => (
                      <Tag key={tag} variant="accent-2">
                        {DIET_TAG_LABELS[tag]}
                      </Tag>
                    ))}
                  </div>
                  <div className="card-title">{recipe.title}</div>
                  <div className="card-meta">
                    <span>{recipe.total_minutes ?? recipe.prep_minutes + recipe.cook_minutes} min</span>
                    <span aria-hidden="true">·</span>
                    <span>Serves {recipe.servings}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
