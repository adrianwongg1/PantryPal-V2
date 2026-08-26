"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

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
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      // Only reached when "Confirm email" is on (Supabase Cloud's default;
      // off locally per supabase/config.toml) — routes the confirmation
      // link's redirect into onboarding rather than auth/callback's own
      // default of /recipes, so a cloud signup sees the same first-run
      // flow as a local one where signUp returns a session immediately.
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/onboarding`,
    },
  });

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

  redirect("/onboarding");
}
