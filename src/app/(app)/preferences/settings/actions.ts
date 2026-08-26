"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { visibilitySchema } from "@/lib/recipes/edit-schema";

export type AccountActionState = { error: string | null; message: string | null };

const accountSchema = z.object({
  email: z.union([z.email(), z.literal("")]),
  password: z.union([z.string().min(6), z.literal("")]),
});

export async function updateAccountAction(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const { supabase } = await requireUser();

  const parsed = accountSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });

  if (!parsed.success) {
    return { error: "A new password needs at least 6 characters.", message: null };
  }

  const updates: { email?: string; password?: string } = {};
  if (parsed.data.email) updates.email = parsed.data.email;
  if (parsed.data.password) updates.password = parsed.data.password;

  if (Object.keys(updates).length === 0) {
    return { error: "Nothing to update — fill in a new email or password first.", message: null };
  }

  const { error } = await supabase.auth.updateUser(updates);
  if (error) {
    return { error: error.message, message: null };
  }

  return {
    error: null,
    message: updates.email
      ? "Check your new email to confirm the change — it won't take effect until then."
      : "Password updated.",
  };
}

export type SettingsActionState = { error: string | null };

const settingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  units: z.enum(["metric", "imperial"]),
  notifyExpiring: z.boolean(),
  notifyWeeklyPlan: z.boolean(),
  defaultVisibility: visibilitySchema,
});

export async function updateSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const { supabase, user } = await requireUser();

  const parsed = settingsSchema.safeParse({
    theme: formData.get("theme"),
    units: formData.get("units"),
    notifyExpiring: formData.get("notifyExpiring") === "on",
    notifyWeeklyPlan: formData.get("notifyWeeklyPlan") === "on",
    defaultVisibility: formData.get("defaultVisibility"),
  });

  if (!parsed.success) {
    return { error: "Something about those settings didn't save — try again." };
  }

  const { error } = await supabase
    .from("user_preferences")
    .update({
      theme: parsed.data.theme,
      units: parsed.data.units,
      notify_expiring: parsed.data.notifyExpiring,
      notify_weekly_plan: parsed.data.notifyWeeklyPlan,
      default_visibility: parsed.data.defaultVisibility,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: "Couldn't save your settings — try again." };
  }

  revalidatePath("/preferences/settings");
  return { error: null };
}

export type DeleteAccountState = { error: string | null };

export async function deleteAccountAction(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const { supabase } = await requireUser();

  if (formData.get("confirm") !== "DELETE") {
    return { error: 'Type "DELETE" to confirm.' };
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    return { error: "Couldn't delete your account — try again." };
  }

  // The account (and its session, server-side) is gone at this point, but
  // the browser still holds the now-invalid cookies until they expire —
  // signOut clears them immediately rather than leaving a stale session
  // sitting in the client until its natural expiry.
  await supabase.auth.signOut();
  redirect("/");
}
