"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { dietTagSchema } from "@/lib/ai/schema";

export type PreferencesActionState = { error: string | null };

const tagListSchema = z.array(z.string().min(1).max(60)).max(20).default([]);

const preferencesSchema = z.object({
  diets: z.array(dietTagSchema).default([]),
  allergies: tagListSchema,
  dislikedIngredients: tagListSchema,
  preferredCuisines: tagListSchema,
  defaultServings: z.coerce.number().int().min(1).max(20),
  maxTotalMinutes: z.coerce.number().int().min(5).max(600).optional(),
  spiceLevel: z.coerce.number().int().min(0).max(3),
});

function parseTagList(raw: FormDataEntryValue | null): unknown {
  return typeof raw === "string" && raw.length > 0 ? JSON.parse(raw) : [];
}

export async function savePreferencesAction(
  _prevState: PreferencesActionState,
  formData: FormData,
): Promise<PreferencesActionState> {
  const { supabase, user } = await requireUser();

  const noTimeLimit = formData.get("noTimeLimit") === "on";

  const parsed = preferencesSchema.safeParse({
    diets: formData.getAll("diets"),
    allergies: parseTagList(formData.get("allergies")),
    dislikedIngredients: parseTagList(formData.get("dislikedIngredients")),
    preferredCuisines: parseTagList(formData.get("preferredCuisines")),
    defaultServings: formData.get("defaultServings"),
    maxTotalMinutes: noTimeLimit ? undefined : formData.get("maxTotalMinutes"),
    spiceLevel: formData.get("spiceLevel"),
  });

  if (!parsed.success) {
    return { error: "Something about those choices didn't save — try again." };
  }

  const { error } = await supabase
    .from("user_preferences")
    .update({
      diets: parsed.data.diets,
      allergies: parsed.data.allergies,
      disliked_ingredients: parsed.data.dislikedIngredients,
      preferred_cuisines: parsed.data.preferredCuisines,
      default_servings: parsed.data.defaultServings,
      max_total_minutes: parsed.data.maxTotalMinutes ?? null,
      spice_level: parsed.data.spiceLevel,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: "Couldn't save your preferences — try again." };
  }

  redirect("/preferences");
}
