import type { MealType } from "@/lib/ai/schema";

type PhotoPlaceholderProps = {
  recipeId: string;
  mealType: MealType;
  className?: string;
  style?: React.CSSProperties;
  /** Visible fallback text — matches the canvas's own "Photo" placeholders. */
  label?: string;
};

const MEAL_BG_VAR: Record<MealType, string> = {
  breakfast: "var(--color-breakfast-100)",
  lunch: "var(--color-lunch-100)",
  dinner: "var(--color-dinner-100)",
  snack: "var(--color-snack-100)",
  dessert: "var(--color-dessert-100)",
};

const MEAL_FG_VAR: Record<MealType, string> = {
  breakfast: "var(--color-breakfast-800)",
  lunch: "var(--color-lunch-800)",
  dinner: "var(--color-dinner-800)",
  snack: "var(--color-snack-800)",
  dessert: "var(--color-dessert-800)",
};

// A deterministic decorative stand-in for a real recipe photo — no image
// generation lands in this pass (see the implementation plan; the bucket
// stays wired for whichever phase adds upload). The same recipe id always
// renders the same pattern, so a card doesn't visibly change between
// renders. Three soft circles — Organic's own visual language ("lean into
// round shapes... soft circular accents"), positioned and sized from a hash
// of the id, tinted with that recipe's own meal-type pair.
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function PhotoPlaceholder({
  recipeId,
  mealType,
  className,
  style,
  label = "Photo",
}: PhotoPlaceholderProps) {
  const seed = hashSeed(recipeId || mealType);
  const circles = [0, 1, 2].map((i) => {
    const shifted = seed >>> (i * 7);
    return {
      cx: 15 + (shifted % 70),
      cy: 15 + ((shifted >>> 3) % 70),
      r: 16 + ((shifted >>> 6) % 24),
    };
  });

  return (
    <div
      className={className}
      style={{
        background: MEAL_BG_VAR[mealType],
        position: "relative",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {circles.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill={MEAL_FG_VAR[mealType]}
            opacity={0.12 + i * 0.05}
          />
        ))}
      </svg>
      <span
        style={{
          position: "relative",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: MEAL_FG_VAR[mealType],
          opacity: 0.7,
        }}
      >
        {label}
      </span>
    </div>
  );
}
