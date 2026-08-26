import type { Difficulty, MealType } from "./schema";

// Shared between /generate's result card, the library grid, the recipe
// detail page, and the edit form — pulled out here once four call sites
// existed, rather than the one GenerateForm.tsx originally had it inline.
export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  dessert: "Dessert",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

// Index = user_preferences.spice_level (0-3). Shared between the prompt
// builder (prompt.ts) and the Preferences page's own heat control, so the
// two can never describe the same stored value differently.
export const SPICE_LABELS = ["no heat", "warm", "hot", "punishing heat"] as const;
