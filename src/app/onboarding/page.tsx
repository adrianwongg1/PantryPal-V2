import { requireUser } from "@/lib/supabase/server";
import { PreferencesForm } from "./PreferencesForm";

export default async function OnboardingPreferencesPage() {
  const { supabase, user } = await requireUser();

  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .select("diets, allergies")
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return (
    <PreferencesForm
      initialDiets={preferences.diets}
      initialAllergies={preferences.allergies}
    />
  );
}
