import { requireUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

// Full CRUD + filter/sort/search lands in Phase 6 — this page exists since
// Phase 1 to prove the auth + RLS path end to end: a signed-in user hits
// their own (currently always empty) slice of `recipes`.
export default async function RecipesPage() {
  const { supabase } = await requireUser();

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, meal_type, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Your recipes</h1>
        <Button disabled>New recipe (coming soon)</Button>
      </div>

      {recipes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 border border-dashed border-[color:var(--color-divider)] py-24 text-center">
          <p className="text-base">No recipes yet.</p>
          <p className="text-sm text-[color:var(--color-muted)]">
            Recipe generation arrives in a later phase — this is where your
            saved recipes will show up.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="border border-[color:var(--color-divider)] px-4 py-3"
            >
              {recipe.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
