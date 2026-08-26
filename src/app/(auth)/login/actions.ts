"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

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
    // confirming whether an email is registered IS a leak. (Not "two tries
    // left before we slow things down" — Supabase rate-limits sign-in
    // attempts, but doesn't expose a remaining-attempts count, so that copy
    // from the design canvas would be a promise this app can't keep.)
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email before logging in." };
    }
    return { error: "That email and password don't match." };
  }

  redirect("/recipes");
}

export type MagicLinkActionState = { status: "idle" | "sent" | "error"; error?: string };

const magicLinkSchema = z.object({ email: z.email() });

// The design canvas draws this on the login page ("Email me a magic link
// instead"), not signup — an alternate way for a RETURNING user to get in,
// never a passwordless signup path. shouldCreateUser: false enforces that:
// without it, a mistyped or unregistered email would silently create an
// account that skips onboarding entirely (dietary preferences never get
// set, and the product's "always ask once" onboarding model breaks).
export async function sendMagicLink(
  _prevState: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", error: "Enter a valid email first." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  // Deliberately the same reassuring, non-committal copy whether this
  // succeeded or failed for "no account with that email" — shouldCreateUser:
  // false makes Supabase return an error for an unregistered address, and
  // surfacing that distinctly would be exactly the enumeration leak the
  // error-message choices elsewhere in this file already avoid. A genuine
  // rate limit is the one failure worth naming, since it doesn't reveal
  // anything about whether the account exists.
  if (error && error.code === "over_email_send_rate_limit") {
    return { status: "error", error: "Too many attempts — try again in a few minutes." };
  }

  return { status: "sent" };
}
