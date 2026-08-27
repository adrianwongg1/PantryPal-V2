import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ModelProvider } from "./generate";

const WINDOW_MINUTES = 10;
const MAX_ATTEMPTS_PER_WINDOW = 10;

export type RateLimitResult =
  | { limited: false }
  | { limited: true; retryAfterMinutes: number };

// A generous, deliberately simple cap meant to stop a runaway or accidental
// request loop from burning the shared Groq free-tier quota, not to police
// normal use — nobody cooking dinner will hit 10 generate attempts in 10
// minutes. Tune later against real usage, not speculatively now.
export async function checkGenerationRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count, error } = await supabase
    .from("generation_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    // Fail open: a rate-limit check that can't run shouldn't be the thing
    // that blocks someone from generating a recipe.
    return { limited: false };
  }

  if ((count ?? 0) >= MAX_ATTEMPTS_PER_WINDOW) {
    return { limited: true, retryAfterMinutes: WINDOW_MINUTES };
  }

  return { limited: false };
}

// Best-effort: a failure to write this log line should never surface as an
// error to someone who just successfully generated (or tried to generate)
// a recipe, so the result is intentionally not checked or thrown on.
export async function recordGenerationEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: ModelProvider,
  succeeded: boolean,
): Promise<void> {
  await supabase.from("generation_events").insert({
    user_id: userId,
    provider,
    succeeded,
  });
}
