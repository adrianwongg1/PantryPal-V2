import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { DIET_TAG_LABELS } from "@/lib/ai/diet-labels";
import { SPICE_LABELS } from "@/lib/ai/recipe-labels";
import { PreferencesForm } from "./PreferencesForm";

export default async function PreferencesPage() {
  const { supabase, user } = await requireUser();

  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .select(
      "diets, allergies, disliked_ingredients, preferred_cuisines, default_servings, max_total_minutes, spice_level",
    )
    .eq("user_id", user.id)
    .single();

  if (error || !preferences) throw error ?? new Error("Preferences not found");

  // "2 saved recipes clash" (design canvas 7d) — a recipe clashes once
  // it's missing at least one diet the user now requires. `cs` (array
  // contains) is PostgREST's operator for "the column's array contains
  // every element of this one"; `.not(..., "cs", ...)` negates it, so this
  // counts recipes that DON'T satisfy every current diet.
  let clashCount = 0;
  if (preferences.diets.length > 0) {
    const { count } = await supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("diet_tags", "cs", `{${preferences.diets.join(",")}}`);
    clashCount = count ?? 0;
  }

  const whatChanges: string[] = [];
  if (preferences.diets.length > 0) {
    whatChanges.push(`Every recipe is ${preferences.diets.map((d) => DIET_TAG_LABELS[d]).join(", ")}.`);
  }
  if (preferences.allergies.length > 0) {
    whatChanges.push(`Never includes: ${preferences.allergies.join(", ")}.`);
  }
  if (preferences.disliked_ingredients.length > 0) {
    whatChanges.push(`Avoided where possible: ${preferences.disliked_ingredients.join(", ")}.`);
  }
  if (preferences.preferred_cuisines.length > 0) {
    whatChanges.push(`Leans toward: ${preferences.preferred_cuisines.join(", ")}.`);
  }
  whatChanges.push(
    preferences.max_total_minutes
      ? `Ready in ${preferences.max_total_minutes} min or less.`
      : "No time limit set.",
  );
  whatChanges.push(`Serves ${preferences.default_servings} by default.`);
  whatChanges.push(`Heat: ${SPICE_LABELS[preferences.spice_level] ?? SPICE_LABELS[0]}.`);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">How you eat</h1>
          <p className="text-sm text-[color:var(--color-muted)]">
            These are never suggestions — every recipe is generated against them as a rule.
          </p>
        </div>
        <Link href="/preferences/settings" className="text-sm text-accent-700 underline">
          Settings
        </Link>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-[280px] flex-[2]">
          <PreferencesForm
            initialDiets={preferences.diets}
            initialAllergies={preferences.allergies}
            initialDislikedIngredients={preferences.disliked_ingredients}
            initialPreferredCuisines={preferences.preferred_cuisines}
            initialServings={preferences.default_servings}
            initialMaxMinutes={preferences.max_total_minutes}
            initialSpiceLevel={preferences.spice_level}
          />
        </div>

        <div className="flex min-w-[220px] flex-1 flex-col gap-4">
          <Card className="gap-2">
            <div className="card-kicker">What this changes</div>
            <ul className="flex flex-col gap-1.5 text-sm">
              {whatChanges.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>

          {clashCount > 0 ? (
            <Card className="gap-2 bg-snack-100">
              <div className="card-title text-snack-800">
                {clashCount} saved {clashCount === 1 ? "recipe" : "recipes"} clash
              </div>
              <p className="card-body text-snack-800">
                {clashCount === 1 ? "It doesn't" : "They don't"} fit every diet you&rsquo;ve set
                above. Nothing&rsquo;s deleted — worth a look next time you&rsquo;re picking
                what to cook.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
