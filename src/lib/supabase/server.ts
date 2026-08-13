import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { publicEnv } from "@/lib/env";

// For Server Components, Server Actions, and Route Handlers. Talks to
// Supabase as the currently signed-in user (via their session cookie) —
// never as service_role — so every query is subject to RLS exactly as if
// it came from the browser. That's deliberate: it's what makes RLS the
// real backstop instead of just a second copy of the app's own logic.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, which can't set cookies.
            // Safe to ignore as long as proxy.ts is refreshing sessions.
          }
        },
      },
    },
  );
}

// The first line of every Server Action and protected page (see
// src/proxy.ts — it only refreshes the session, it does not gate access).
// Throwing here rather than returning null means a caller can never
// accidentally skip the check by forgetting an `if`.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  return { supabase, user };
}
