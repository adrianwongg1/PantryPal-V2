// pantry_items.category is free text with no enum behind it — nothing
// upstream (onboarding's quick-add, the edit form) ever sets it, so this
// is the first place a canonical list is needed. Four groups, matching
// where the design canvas's pantry screen (1d) actually groups things.
export const PANTRY_CATEGORIES = ["fridge", "freezer", "cupboard", "fresh"] as const;
export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

export const PANTRY_CATEGORY_LABELS: Record<PantryCategory, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  cupboard: "Cupboard",
  fresh: "Fresh",
};

// Rows with no category (every item added before this phase, or via the
// onboarding step, which never asked) fall into this bucket rather than
// being hidden or guessed at.
export const UNCATEGORIZED_LABEL = "Uncategorized";

export function isPantryCategory(value: string | null): value is PantryCategory {
  return value !== null && (PANTRY_CATEGORIES as readonly string[]).includes(value);
}

// A row counts as "use soon" once it's within this many days of its own
// expires_on (inclusive of already-expired) — a simple, fixed threshold
// rather than a per-category or per-item rule, matching the design
// canvas's own single amber treatment with no stated per-item logic.
export const USE_SOON_WINDOW_DAYS = 3;

export function isUseSoon(expiresOn: string | null, today = new Date()): boolean {
  if (!expiresOn) return false;
  const expiry = new Date(`${expiresOn}T00:00:00`);
  const diffDays = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= USE_SOON_WINDOW_DAYS;
}
