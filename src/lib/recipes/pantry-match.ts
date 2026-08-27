import type { Ingredient } from "@/lib/ai/schema";

// Matches recipe ingredients against a user's pantry. Naive string
// comparison fails immediately — recipe "Cooked chicken, shredded" vs
// pantry "Rotisserie chicken" share no substring worth matching on. So
// matching goes through each ingredient's pantry_key (a short canonical
// name the model is asked to emit alongside the human-readable ingredient
// text — see lib/ai/schema.ts), normalized, with a small hand-picked alias
// table as a backup for the cases where two reasonable people would name
// the same thing differently.
//
// This backs four screens in the design canvas: the recipe detail "two
// short" warning (1c/7a), the pantry-driven match scores (2c), "for
// Chicken & ginger congee" on the shopping list (5a), and the weekly
// board's short-ingredient dot (6a).

export type PantryItemLike = {
  name: string;
  status?: "have" | "need";
};

// Every term in a group is treated as the same ingredient. Deliberately
// small, not a generalized thesaurus — add to this only when a real
// mismatch is observed in practice, not speculatively.
const ALIAS_GROUPS: readonly (readonly string[])[] = [
  ["coriander", "cilantro"],
  ["spring onion", "scallion", "green onion"],
  ["chili", "chilli", "chile", "chile pepper"],
  ["eggplant", "aubergine"],
  ["zucchini", "courgette"],
  ["arugula", "rocket"],
  ["bell pepper", "capsicum", "sweet pepper"],
  ["shrimp", "prawn"],
  ["all purpose flour", "plain flour"],
  ["confectioners sugar", "icing sugar", "powdered sugar"],
  ["heavy cream", "double cream"],
  ["cornstarch", "corn flour"],
];

const ALIAS_LOOKUP = new Map<string, string>();
for (const group of ALIAS_GROUPS) {
  const canonical = group[0];
  for (const term of group) ALIAS_LOOKUP.set(term, canonical);
}

// Light plural fold — deliberately not a full stemmer, just the regular
// English cases common among grocery nouns. What matters for matching
// purposes isn't linguistic correctness, only that the same input folds to
// the same output on both sides of a comparison.
function foldTrailingPlural(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y"; // berries -> berry
  if (word.endsWith("oes")) return word.slice(0, -2); // tomatoes -> tomato
  if (word.endsWith("ss") || word.endsWith("us")) return word; // watercress, couscous, hummus, asparagus
  if (word.endsWith("s")) return word.slice(0, -1); // limes -> lime, onions -> onion
  return word;
}

export function normalizePantryKey(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents: jalapeño -> jalapeno
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[\s-]+/g, " ")
    .trim();

  const singular = foldTrailingPlural(cleaned);
  return ALIAS_LOOKUP.get(singular) ?? singular;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word containment, not a raw substring test: "egg" must not match
// inside "eggplant". Both arguments are expected to already be normalized.
function containsAsWholePhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return new RegExp(`(^|\\s)${escapeRegExp(needle)}($|\\s)`).test(haystack);
}

// Equal after normalizing, OR one side is a whole-word phrase inside the
// other. The second clause is the fix for the exact case this module opens
// by naming: a bare exact-match on pantry_key would require "chicken" to
// equal "rotisserie chicken" outright, which it never will — real pantry
// names carry extra description a short canonical key doesn't. Checked
// both directions since either side can be the more specific one. This
// trades a handful of false positives (an ingredient asking for "lime"
// would match a pantry item named, implausibly, "key lime pie") for far
// fewer false negatives against how people actually name pantry items —
// the right side of that tradeoff for a "you have this" hint, not a
// safety-critical check.
export function pantryKeysMatch(a: string, b: string): boolean {
  const na = normalizePantryKey(a);
  const nb = normalizePantryKey(b);
  if (na === nb) return true;
  return containsAsWholePhrase(na, nb) || containsAsWholePhrase(nb, na);
}

export type IngredientMatch = {
  ingredient: Ingredient;
  matched: boolean;
  matchedPantryItemName: string | null;
};

// Only pantry rows with status "have" count as "you already have this" — a
// "need" row (already on the shopping list) hasn't been bought yet and
// doesn't satisfy a recipe.
export function matchIngredientsToPantry(
  ingredients: readonly Ingredient[],
  pantryItems: readonly PantryItemLike[],
): IngredientMatch[] {
  const haveItems = pantryItems.filter((item) => (item.status ?? "have") === "have");

  return ingredients.map((ingredient) => {
    const hit = haveItems.find((item) => pantryKeysMatch(ingredient.pantry_key, item.name));
    return {
      ingredient,
      matched: hit !== undefined,
      matchedPantryItemName: hit?.name ?? null,
    };
  });
}

export type PantryMatchSummary = {
  matchedCount: number;
  requiredCount: number; // excludes optional ingredients
  missing: Ingredient[]; // required, unmatched
  isComplete: boolean;
};

// The aggregate the "5 of 7 in your pantry" / "you're two short" UI reads
// from. Optional ingredients are excluded from both counts — an optional
// item being unmatched should never push a recipe out of "complete".
export function summarizePantryMatch(
  ingredients: readonly Ingredient[],
  pantryItems: readonly PantryItemLike[],
): PantryMatchSummary {
  const matches = matchIngredientsToPantry(ingredients, pantryItems).filter(
    (m) => !m.ingredient.optional,
  );
  const missing = matches.filter((m) => !m.matched).map((m) => m.ingredient);

  return {
    matchedCount: matches.length - missing.length,
    requiredCount: matches.length,
    missing,
    isComplete: missing.length === 0,
  };
}
