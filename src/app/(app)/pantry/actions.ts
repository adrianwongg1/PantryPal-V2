"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { parsePantryEntry } from "@/lib/pantry/parse";
import { PANTRY_CATEGORIES } from "@/lib/pantry/categories";

export type PantryActionState = { error: string | null };

const addItemSchema = z.object({
  text: z.string().min(1).max(120),
  category: z.enum(PANTRY_CATEGORIES).optional(),
  expiresOn: z.string().date().optional().or(z.literal("")),
});

export async function addPantryItemAction(formData: FormData): Promise<PantryActionState> {
  const { supabase, user } = await requireUser();

  const parsed = addItemSchema.safeParse({
    text: formData.get("text"),
    category: formData.get("category") || undefined,
    expiresOn: formData.get("expiresOn") ?? "",
  });

  if (!parsed.success) {
    return { error: "Couldn't read that — try again." };
  }

  const entry = parsePantryEntry(parsed.data.text);
  if (!entry.name) {
    return { error: "Type something to add first." };
  }

  // upsert, not insert: pantry_items has a citext-backed unique
  // (user_id, name, status), so re-adding something already in the
  // pantry (a very normal thing to do — "we're out of milk" then later
  // "got more milk") would otherwise fail the whole request on a unique
  // violation. Re-adding just refreshes the quantity/unit/category/expiry
  // instead of erroring.
  const { error } = await supabase.from("pantry_items").upsert(
    {
      user_id: user.id,
      name: entry.name,
      quantity: entry.quantity,
      unit: entry.unit,
      category: parsed.data.category ?? null,
      expires_on: parsed.data.expiresOn || null,
      status: "have",
    },
    { onConflict: "user_id,name,status" },
  );

  if (error) {
    return { error: "Couldn't save that item — try again." };
  }

  revalidatePath("/pantry");
  return { error: null };
}

export async function deletePantryItemAction(itemId: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("pantry_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/pantry");
}
