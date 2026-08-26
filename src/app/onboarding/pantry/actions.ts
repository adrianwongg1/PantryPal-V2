"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export type PantryStepActionState = { error: string | null };

const itemSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.number().positive().max(100_000).nullable(),
  unit: z.string().max(20).nullable(),
});
const itemsSchema = z.array(itemSchema).max(30);

export async function finishPantryStep(
  _prevState: PantryStepActionState,
  formData: FormData,
): Promise<PantryStepActionState> {
  const { supabase, user } = await requireUser();

  const raw = formData.get("items");
  const parsed = itemsSchema.safeParse(
    typeof raw === "string" && raw.length > 0 ? JSON.parse(raw) : [],
  );

  if (!parsed.success) {
    return { error: "Something about those items didn't save — try again." };
  }

  if (parsed.data.length > 0) {
    // pantry_items has a citext-backed unique (user_id, name, status) —
    // de-duped case-insensitively here rather than trusting the client
    // list is already clean, since a single conflicting row fails the
    // whole batch insert. Keeps the last entry for a given name, matching
    // "the most recent thing you typed wins" rather than silently
    // dropping a correction.
    const seen = new Map<string, (typeof parsed.data)[number]>();
    for (const item of parsed.data) seen.set(item.name.toLowerCase(), item);

    const { error } = await supabase.from("pantry_items").insert(
      Array.from(seen.values()).map((item) => ({
        user_id: user.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      })),
    );
    if (error) {
      return { error: "Couldn't save your pantry — try again." };
    }
  }

  redirect("/recipes");
}

export async function skipPantryStep() {
  await requireUser();
  redirect("/recipes");
}
