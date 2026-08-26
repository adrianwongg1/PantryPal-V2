import type { DietTag } from "./schema";

// Human-readable labels for DIET_TAGS — shared between onboarding's "How
// you eat" step and the full Preferences page (Phase 7), which shows the
// exact same 12 chips (design canvas 1e/6c/7d all draw this identical
// list). Order matches the canvas's own left-to-right chip order.
export const DIET_TAG_LABELS: Record<DietTag, string> = {
  dairy_free: "Dairy-free",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  halal: "Halal",
  kosher: "Kosher",
  gluten_free: "Gluten-free",
  low_carb: "Low carb",
  keto: "Keto",
  paleo: "Paleo",
  low_sodium: "Low sodium",
  nut_free: "Nut-free",
};

export const DIET_TAG_ORDER: DietTag[] = [
  "dairy_free",
  "vegetarian",
  "vegan",
  "pescatarian",
  "halal",
  "kosher",
  "gluten_free",
  "low_carb",
  "keto",
  "paleo",
  "low_sodium",
  "nut_free",
];
