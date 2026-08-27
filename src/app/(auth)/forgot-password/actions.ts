"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export type ForgotPasswordActionState = { status: "idle" | "sent" | "error"; error?: string };

const forgotPasswordSchema = z.object({ email: z.email() });

// Unlike sendMagicLink in ../login/actions.ts (which needs shouldCreateUser:
// false and so gets an explicit error for an unregistered address),
// resetPasswordForEmail never errors for one — Supabase deliberately
// returns success either way so the response can't be used to confirm
// whether an email is registered. A genuine rate limit is the one failure
// worth naming, since it reveals nothing about account existence.
export async function requestPasswordReset(
  _prevState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", error: "Enter a valid email first." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (error && error.code === "over_email_send_rate_limit") {
    return { status: "error", error: "Too many attempts — try again in a few minutes." };
  }

  return { status: "sent" };
}
