"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string | null };

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // email_not_confirmed is safe to call out by name: the caller already
    // knows this is their own email, so it's helpful, not an enumeration
    // leak. Every other case gets a deliberately generic message —
    // confirming whether an email is registered IS a leak.
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email before logging in." };
    }
    return { error: "Incorrect email or password." };
  }

  redirect("/recipes");
}
