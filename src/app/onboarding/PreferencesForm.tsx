"use client";

import { useActionState } from "react";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { TagInput } from "@/components/ui/TagInput";
import { Button } from "@/components/ui/Button";
import { DIET_TAG_LABELS, DIET_TAG_ORDER } from "@/lib/ai/diet-labels";
import {
  saveDietaryPreferences,
  skipDietaryPreferences,
  type PreferencesActionState,
} from "./actions";

const initialState: PreferencesActionState = { error: null };

export function PreferencesForm({
  initialDiets,
  initialAllergies,
}: {
  initialDiets: string[];
  initialAllergies: string[];
}) {
  const [state, formAction, pending] = useActionState(saveDietaryPreferences, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-6">
      <div>
        <div className="mb-2 text-[10.5px] uppercase tracking-[0.1em] text-accent-700">
          Step 1 of 2
        </div>
        <h1 className="mb-2 text-[29px]">Anything you can&rsquo;t eat?</h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          Set it once. It becomes a rule, not a preference — every recipe respects it.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DIET_TAG_ORDER.map((tag) => (
          <ChipToggle
            key={tag}
            name="diets"
            value={tag}
            defaultChecked={initialDiets.includes(tag)}
          >
            {DIET_TAG_LABELS[tag]}
          </ChipToggle>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-[26px] bg-surface p-4">
        <p className="text-sm text-[color:var(--color-muted)]">
          Allergies — type them, we don&rsquo;t keep a list
        </p>
        <TagInput
          name="allergies"
          defaultValue={initialAllergies}
          placeholder="Add one"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-accent-700">
          {state.error}
        </p>
      ) : null}

      <p className="rounded-[24px] bg-lunch-100 p-4 text-sm text-lunch-800">
        You can change all of this later in Preferences. Skipping is fine too.
      </p>

      <div className="flex gap-2.5">
        <Button
          type="submit"
          formAction={skipDietaryPreferences}
          variant="secondary"
          className="flex-1"
        >
          Skip
        </Button>
        <Button type="submit" disabled={pending} className="flex-[2]">
          {pending ? "Saving…" : "Next — stock the pantry"}
        </Button>
      </div>
    </form>
  );
}
