"use client";

import { useActionState, useState } from "react";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Seg } from "@/components/ui/Seg";
import { Stepper } from "@/components/ui/Stepper";
import { Tag, MealTag } from "@/components/ui/Tag";
import { Card } from "@/components/ui/Card";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { DIFFICULTIES, MEAL_TYPES, type Difficulty, type MealType } from "@/lib/ai/schema";
import { DIET_TAG_LABELS } from "@/lib/ai/diet-labels";
import { MEAL_LABELS, DIFFICULTY_LABELS } from "@/lib/ai/recipe-labels";
import { generateRecipeAction, saveRecipeAction, type GenerateActionState } from "./actions";

const initialState: GenerateActionState = { status: "idle" };

function reassuranceCopy(diets: string[], allergies: string[]): string | null {
  const dietPart = diets.map((d) => DIET_TAG_LABELS[d as keyof typeof DIET_TAG_LABELS]).join(", ");
  const allergyPart = allergies.length > 0 ? `no ${allergies.join(" or ")}` : "";
  const parts = [dietPart, allergyPart].filter(Boolean);
  if (parts.length === 0) return null;
  return `${parts.join(", ")}, always — from your preferences`;
}

export function GenerateForm({
  defaultServings,
  defaultMaxMinutes,
  diets,
  allergies,
  hasAnthropicFallback,
}: {
  defaultServings: number;
  defaultMaxMinutes: number;
  diets: string[];
  allergies: string[];
  hasAnthropicFallback: boolean;
}) {
  const [state, formAction, pending] = useActionState(generateRecipeAction, initialState);
  const [freeText, setFreeText] = useState("");
  const [servings, setServings] = useState(defaultServings);
  const [maxMinutes, setMaxMinutes] = useState(defaultMaxMinutes);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [mealType, setMealType] = useState<MealType>("dinner");

  const reassurance = reassuranceCopy(diets, allergies);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-[0.1em] text-accent-700">
          Generate
        </div>
        <h1 className="mb-2 max-w-xl text-4xl">What&rsquo;s in your kitchen tonight?</h1>
        <p className="max-w-lg text-[15px] text-[color:var(--color-muted)]">
          Anything goes — half an onion, the sad end of a lime. Tell PantryPal what you
          have and it&rsquo;ll turn it into something cookable.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-5 rounded-[30px] bg-surface p-6">
        <Textarea
          name="freeText"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="half a rotisserie chicken, cooked rice, a lime…"
          className="min-h-[104px] bg-bg text-base"
        />

        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="text-xs text-[color:var(--color-muted)]">
            Type what you have — the more specific, the better.
          </span>
          <Button type="submit" className="ml-auto" disabled={pending || freeText.trim().length === 0}>
            {pending ? "Thinking…" : "Make me something"}
          </Button>
        </div>

        <div className="h-px bg-[color:var(--color-divider)]" />

        <div className="flex flex-wrap items-end gap-7">
          <div className="min-w-[230px]">
            <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">
              Ready in <strong className="font-heading font-normal">{maxMinutes} min</strong>{" "}
              or less
            </div>
            <input
              type="range"
              name="maxMinutes"
              min={10}
              max={90}
              step={5}
              value={maxMinutes}
              onChange={(e) => setMaxMinutes(Number(e.target.value))}
              className="w-[230px] accent-accent"
            />
          </div>

          <div>
            <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Serves</div>
            <Stepper value={servings} onChange={setServings} min={1} max={12} label="servings" />
            <input type="hidden" name="servings" value={servings} />
          </div>

          <div>
            <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Effort</div>
            <Seg
              name="difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
              aria-label="Effort"
            />
          </div>

          <div>
            <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Meal</div>
            <Seg
              name="mealType"
              value={mealType}
              onChange={setMealType}
              options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] }))}
              aria-label="Meal"
            />
          </div>
        </div>

        {reassurance ? (
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-lunch-100 px-3.5 py-2 text-xs text-lunch-800">
            {reassurance}
          </div>
        ) : null}

        {pending ? <GeneratingSkeleton /> : null}

        {!pending && state.status === "error" ? (
          <ErrorState message={state.message} hasAnthropicFallback={hasAnthropicFallback} />
        ) : null}

        {!pending && state.status === "result" ? (
          <>
            <input type="hidden" name="recipe" value={JSON.stringify(state.recipe)} />
            <ResultCard state={state} />
          </>
        ) : null}
      </form>
    </div>
  );
}

function GeneratingSkeleton() {
  return (
    <div
      className="flex animate-pulse flex-col gap-4 rounded-[30px] bg-bg p-6"
      role="status"
      aria-label="Generating your recipe"
    >
      <div className="text-xs text-[color:var(--color-muted)]">
        Tasting the combination… this takes about five seconds.
      </div>
      <div className="h-6 w-1/2 rounded-full bg-[color:var(--color-divider)]" />
      <div className="flex gap-2.5">
        <div className="h-5 w-24 rounded-full bg-[color:var(--color-divider)]" />
        <div className="h-5 w-20 rounded-full bg-[color:var(--color-divider)]" />
      </div>
      <div className="flex gap-5">
        <div className="flex flex-1 flex-col gap-2.5">
          <div className="h-3 rounded-full bg-[color:var(--color-divider)]" />
          <div className="h-3 w-4/5 rounded-full bg-[color:var(--color-divider)]" />
          <div className="h-3 w-3/5 rounded-full bg-[color:var(--color-divider)]" />
        </div>
        <div className="flex flex-[1.4] flex-col gap-2.5">
          <div className="h-3 rounded-full bg-[color:var(--color-divider)]" />
          <div className="h-3 w-11/12 rounded-full bg-[color:var(--color-divider)]" />
          <div className="h-3 w-2/3 rounded-full bg-[color:var(--color-divider)]" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  hasAnthropicFallback,
}: {
  message: string;
  hasAnthropicFallback: boolean;
}) {
  return (
    <div role="alert" className="flex gap-4 rounded-[30px] bg-snack-100 p-6">
      <div className="flex-1">
        <h3 className="mb-1 text-xl">That one came out as nonsense</h3>
        <p className="mb-3.5 max-w-lg text-sm text-snack-800">{message}</p>
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit">Try again</Button>
          {hasAnthropicFallback ? (
            <Button type="submit" name="provider" value="anthropic" variant="secondary">
              Try a different model
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  state,
}: {
  state: Extract<GenerateActionState, { status: "result" }>;
}) {
  const { recipe, pantryMatch } = state;
  const totalMinutes = recipe.prep_minutes + recipe.cook_minutes;

  return (
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
                ? `Uses everything you have`
                : `You have ${pantryMatch.matchedCount} of ${pantryMatch.requiredCount} things`}
            </Tag>
          </div>
          <h2 className="mb-1.5 text-[31px]">{recipe.title}</h2>
          {recipe.summary ? (
            <p className="max-w-lg text-sm text-[color:var(--color-muted)]">{recipe.summary}</p>
          ) : null}
        </div>
        <PhotoPlaceholder
          recipeId={recipe.title}
          mealType={recipe.meal_type}
          className="h-[140px] w-[200px] flex-none rounded-[24px]"
        />
      </div>

      <div className="flex flex-wrap gap-6 text-[13px] text-[color:var(--color-muted)]">
        <span>{totalMinutes} min · {recipe.prep_minutes} prep / {recipe.cook_minutes} cook</span>
        <span>Serves {recipe.servings}</span>
        <span>{DIFFICULTY_LABELS[recipe.difficulty]}{recipe.cuisine ? ` · ${recipe.cuisine}` : ""}</span>
      </div>

      {!pantryMatch.isComplete ? (
        <div className="rounded-[20px] bg-accent-2-100 p-3.5 text-xs text-accent-2-800">
          Add {pantryMatch.missing.length > 1 ? "these to" : "this to"} your list:{" "}
          {pantryMatch.missing.map((i) => i.name).join(", ")}. It still works without{" "}
          {pantryMatch.missing.length > 1 ? "them" : "it"}.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-7">
        <div className="min-w-[230px] flex-1">
          <h6 className="mb-3 text-[color:var(--color-muted)]">Ingredients</h6>
          <div className="flex flex-col gap-2 text-sm">
            {recipe.ingredients.map((ingredient, i) => (
              // pantry_key is a matching key, not a unique id -- two
              // ingredients can legitimately share one (found live in
              // Phase 6 on the same-shaped list on the recipe detail
              // page), so it can't double as a React list key here either.
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
          <h6 className="mb-3 text-[color:var(--color-muted)]">Then</h6>
          <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-relaxed">
            {recipe.steps.map((step, i) => (
              <li key={i}>{step.text}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <input type="hidden" name="model" value={`${state.provider}:generated`} />
        <Button type="submit" formAction={saveRecipeAction}>
          Save to my recipes
        </Button>
        <Button type="submit" variant="secondary">
          Something else
        </Button>
      </div>
    </Card>
  );
}
