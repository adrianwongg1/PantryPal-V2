"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

export type ResetPasswordActionState = { error: string | null };

// min(6) mirrors auth.minimum_password_length in supabase/config.toml, same
// rule as signup/actions.ts.
const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters."),
});

// requireUser() (throws rather than redirects) is correct here: this is a
// Server Action, not a page visit, and page.tsx already redirects an
// unauthenticated visitor to /forgot-password before this form can ever
// render — a POST here without a session is anomalous, not a normal case
// to handle gracefully.
export async function resetPassword(
  _prevState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a new password." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: error.message };
  }

  redirect("/recipes");
}
