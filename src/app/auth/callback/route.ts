import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the code Supabase appends to email confirmation / magic-link
// redirects for a session. Not exercised by the local password-signup path
// (auth.email.enable_confirmations = false in supabase/config.toml), but
// required wherever confirmations are on, e.g. the hosted project.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/recipes";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
