import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

// Deliberately does NOT use requireUser() here — that throws, which is
// right for a Server Action (an unauthenticated POST is anomalous) but
// wrong for a normal page visit, where the correct behavior is a redirect
// to /login. proxy.ts only refreshes the session (see its own comment), so
// this check is the actual authorization gate for every route under (app).
export default async function AppLayout({
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

  return <AppShell email={user.email ?? ""}>{children}</AppShell>;
}
