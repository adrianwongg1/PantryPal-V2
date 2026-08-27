"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string | null; message?: string };

// min(6) mirrors auth.minimum_password_length in supabase/config.toml —
// keep the two in sync if that ever changes.
const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Enter a valid email and password.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return { error: error.message };
  }

  // Whether signUp returns an active session depends on the project's
  // "Confirm email" auth setting (off locally per supabase/config.toml,
  // but Supabase Cloud projects default it on) — signUp succeeding is not
  // the same as being signed in, so only redirect when a session exists.
  if (!data.session) {
    return {
      error: null,
      message: "Check your email to confirm your account, then log in.",
    };
  }

  redirect("/recipes");
}
