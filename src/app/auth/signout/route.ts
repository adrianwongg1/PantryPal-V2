import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// A plain <form method="post"> target (see AppShell) rather than a Server
// Action, so signing out is a normal navigation with no client JS required.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303: force the follow-up request to be a GET, not a re-POST.
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
