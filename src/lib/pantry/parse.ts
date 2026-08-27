// Parses free-typed pantry entries ("2 limes", "half a bag of rice", "a
// handful of coriander") into {quantity, unit, name} — the shape
// pantry_items.quantity/unit/name expect directly. Backs the "parses
// quantity and unit for you" input on the pantry page (1d) and the
// ingredient rows on the recipe edit form (7c).
//
// Deliberately a small hand-written parser, not an AI call: this runs on
// every keystroke / every ingredient row, and a model round-trip per
// keystroke isn't viable. It covers the common cases the design actually
// shows; anything it can't confidently parse just becomes the whole
// string as `name` with quantity/unit left null, which is always a safe,
// inspectable fallback — never a wrong guess presented as a right one.

export type ParsedPantryEntry = {
  quantity: number | null;
  unit: string | null;
  name: string;
};

const UNIT_WORDS = new Set([
  "g", "gram", "grams", "kg", "kilogram", "kilograms", "mg",
  "ml", "milliliter", "milliliters", "millilitre", "millilitres",
  "l", "liter", "liters", "litre", "litres",
  "tsp", "teaspoon", "teaspoons", "tbsp", "tablespoon", "tablespoons",
  "cup", "cups", "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds",
  "bunch", "bunches", "bag", "bags", "tin", "tins", "can", "cans",
  "jar", "jars", "clove", "cloves", "pinch", "pinches",
  "handful", "handfuls", "packet", "packets", "slice", "slices",
  "piece", "pieces", "sprig", "sprigs", "stick", "sticks", "head", "heads",
  "bottle", "bottles", "box", "boxes", "bar", "bars",
]);

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1,
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  half: 0.5, quarter: 0.25,
};

const VULGAR_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3,
  "¼": 0.25, "¾": 0.75, "⅕": 0.2, "⅛": 0.125,
};

export function parsePantryEntry(raw: string): ParsedPantryEntry {
  let text = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return { quantity: null, unit: null, name: "" };

  // "400g" -> "400 g" so the numeric match below can see the unit as its
  // own word.
  text = text.replace(/^(\d+(?:\.\d+)?)([a-z]+)/, "$1 $2");

  let quantity: number | null = null;

  // "half a bag of rice" / "half a lime" — a fractional word directly
  // before the article. The article itself is dropped (not put back): the
  // unit/name split below runs on "bag of rice" or "lime" directly, same
  // as it would for any other already-quantified entry.
  const halfArticle = text.match(/^(half|quarter)\s+(?:a|an)\s+(.*)$/);
  if (halfArticle) {
    quantity = WORD_NUMBERS[halfArticle[1]];
    text = halfArticle[2];
  }

  // Leading numeric quantity: "2", "1.5", "1/2", or a vulgar fraction.
  if (quantity === null) {
    const numeric = text.match(/^(\d+\s?\/\s?\d+|\d+(?:\.\d+)?|[½⅓⅔¼¾⅕⅛])\s+(.*)$/);
    if (numeric) {
      const raw = numeric[1].replace(/\s/g, "");
      if (raw in VULGAR_FRACTIONS) {
        quantity = VULGAR_FRACTIONS[raw];
      } else if (raw.includes("/")) {
        const [n, d] = raw.split("/").map(Number);
        quantity = d ? n / d : Number(raw);
      } else {
        quantity = Number(raw);
      }
      text = numeric[2];
    }
  }

  // Leading word-number ("a", "an", "two", ...), only if the fraction/
  // numeric branches above didn't already consume one.
  if (quantity === null) {
    const wordMatch = text.match(/^([a-z]+)\s+(.*)$/);
    if (wordMatch && wordMatch[1] in WORD_NUMBERS) {
      quantity = WORD_NUMBERS[wordMatch[1]];
      text = wordMatch[2];
    }
  }

  // A leading recognized unit word, with a connective "of" dropped
  // ("bag of rice" -> unit "bag", rest "rice").
  const words = text.split(" ").filter(Boolean);
  let unit: string | null = null;
  if (words.length > 1 && UNIT_WORDS.has(words[0])) {
    unit = words[0];
    words.shift();
    if (words[0] === "of") words.shift();
  }

  const name = words.join(" ").trim();
  return { quantity, unit, name: name || text.trim() };
}
