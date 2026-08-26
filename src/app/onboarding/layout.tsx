import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";

// A route group of its own, not (app) — onboarding is a full-screen wizard
// with no sidebar/nav chrome (the design canvas draws it that way: 3c
// shows only a progress bar and the step content, nothing else). Same
// redirect-based auth gate as (app)/layout.tsx (not requireUser(), which
// throws — the right response to an unauthenticated page visit here is a
// redirect, not an error).
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="flex items-center justify-center gap-2 px-6 py-6">
        <Logo size={24} />
        <span className="font-heading text-base">PantryPal</span>
      </header>
      <main className="flex flex-1 flex-col items-center px-6 pb-16">{children}</main>
    </div>
  );
}
