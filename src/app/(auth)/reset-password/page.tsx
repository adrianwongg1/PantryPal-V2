import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";
import { ResetPasswordForm } from "./ResetPasswordForm";

// Reached only via the emailed recovery link, after /auth/callback has
// already exchanged its code for a session — same redirect-based auth gate
// as (app)/layout.tsx and onboarding/layout.tsx (not requireUser(), which
// throws; an expired or already-used reset link is a normal visit here,
// not an anomaly, and deserves a redirect back to requesting a new one
// rather than an error page).
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo size={27} title="PantryPal" />
        <h1 className="text-2xl">Set a new password</h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          Choose a new password for your account.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
