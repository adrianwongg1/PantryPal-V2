"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { dietTagSchema } from "@/lib/ai/schema";

export type PreferencesActionState = { error: string | null };

const preferencesSchema = z.object({
  diets: z.array(dietTagSchema).default([]),
  allergies: z.array(z.string().min(1).max(60)).max(20).default([]),
});

export async function saveDietaryPreferences(
  _prevState: PreferencesActionState,
  formData: FormData,
): Promise<PreferencesActionState> {
  const { supabase, user } = await requireUser();

  const allergiesRaw = formData.get("allergies");
  const parsed = preferencesSchema.safeParse({
    diets: formData.getAll("diets"),
    allergies:
      typeof allergiesRaw === "string" && allergiesRaw.length > 0
        ? JSON.parse(allergiesRaw)
        : [],
  });

  if (!parsed.success) {
    return { error: "Something about those choices didn't save — try again." };
  }

  const { error } = await supabase
    .from("user_preferences")
    .update({ diets: parsed.data.diets, allergies: parsed.data.allergies })
    .eq("user_id", user.id);

  if (error) {
    return { error: "Couldn't save your preferences — try again." };
  }

  redirect("/onboarding/pantry");
}

// A plain (non-useActionState) Server Action bound directly to a form —
// there's no pending/error state worth tracking for a button whose only
// job is "move on without saving anything".
export async function skipDietaryPreferences() {
  await requireUser();
  redirect("/onboarding/pantry");
}
