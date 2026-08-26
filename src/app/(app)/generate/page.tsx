import { requireUser } from "@/lib/supabase/server";
import { hasAnthropicFallback } from "@/lib/ai/generate";
import { GenerateForm } from "./GenerateForm";

export default async function GeneratePage() {
  const { supabase, user } = await requireUser();

  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .select("default_servings, max_total_minutes, diets, allergies")
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return (
    <GenerateForm
      defaultServings={preferences.default_servings}
      defaultMaxMinutes={preferences.max_total_minutes ?? 30}
      diets={preferences.diets}
      allergies={preferences.allergies}
      hasAnthropicFallback={hasAnthropicFallback}
    />
  );
}
