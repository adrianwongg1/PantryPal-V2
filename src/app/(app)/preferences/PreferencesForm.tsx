"use client";

import { useActionState, useState } from "react";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { TagInput } from "@/components/ui/TagInput";
import { Seg } from "@/components/ui/Seg";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { DIET_TAG_LABELS, DIET_TAG_ORDER } from "@/lib/ai/diet-labels";
import { SPICE_LABELS } from "@/lib/ai/recipe-labels";
import { savePreferencesAction, type PreferencesActionState } from "./actions";

const initialState: PreferencesActionState = { error: null };

const SPICE_OPTIONS = SPICE_LABELS.map((label, i) => ({ value: String(i), label }));

export function PreferencesForm({
  initialDiets,
  initialAllergies,
  initialDislikedIngredients,
  initialPreferredCuisines,
  initialServings,
  initialMaxMinutes,
  initialSpiceLevel,
}: {
  initialDiets: string[];
  initialAllergies: string[];
  initialDislikedIngredients: string[];
  initialPreferredCuisines: string[];
  initialServings: number;
  initialMaxMinutes: number | null;
  initialSpiceLevel: number;
}) {
  const [state, formAction, pending] = useActionState(savePreferencesAction, initialState);
  const [servings, setServings] = useState(initialServings);
  const [spiceLevel, setSpiceLevel] = useState(String(initialSpiceLevel));
  const [noTimeLimit, setNoTimeLimit] = useState(initialMaxMinutes === null);
  const [maxMinutes, setMaxMinutes] = useState(initialMaxMinutes ?? 60);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div>
        <div className="mb-2 text-xs text-[color:var(--color-muted)]">Diets</div>
        <div className="flex flex-wrap gap-2">
          {DIET_TAG_ORDER.map((tag) => (
            <ChipToggle key={tag} name="diets" value={tag} defaultChecked={initialDiets.includes(tag)}>
              {DIET_TAG_LABELS[tag]}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-[color:var(--color-muted)]">
          Allergies — typed, not chosen from a list
        </div>
        <TagInput name="allergies" defaultValue={initialAllergies} placeholder="Add one" />
      </div>

      <div>
        <div className="mb-2 text-xs text-[color:var(--color-muted)]">Would rather not eat</div>
        <TagInput
          name="dislikedIngredients"
          defaultValue={initialDislikedIngredients}
          placeholder="Add one"
        />
      </div>

      <div>
        <div className="mb-2 text-xs text-[color:var(--color-muted)]">Leans toward these cuisines</div>
        <TagInput
          name="preferredCuisines"
          defaultValue={initialPreferredCuisines}
          placeholder="Add one"
        />
      </div>

      <div className="flex flex-wrap gap-7">
        <div>
          <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Default servings</div>
          <Stepper value={servings} onChange={setServings} min={1} max={20} label="servings" />
          <input type="hidden" name="defaultServings" value={servings} />
        </div>

        <div>
          <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Heat</div>
          <Seg name="spiceLevel" value={spiceLevel} onChange={setSpiceLevel} options={SPICE_OPTIONS} />
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">
          {noTimeLimit ? "Ready in: no limit" : `Ready in ${maxMinutes} min or less`}
        </div>
        <div className="flex items-center gap-3.5">
          <input
            type="range"
            name="maxTotalMinutes"
            min={10}
            max={180}
            step={5}
            value={maxMinutes}
            disabled={noTimeLimit}
            onChange={(e) => setMaxMinutes(Number(e.target.value))}
            className="w-[230px] accent-accent disabled:opacity-40"
          />
          <label className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted)]">
            <input
              type="checkbox"
              name="noTimeLimit"
              checked={noTimeLimit}
              onChange={(e) => setNoTimeLimit(e.target.checked)}
            />
            No limit
          </label>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-snack-800">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
