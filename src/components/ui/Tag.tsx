import type { HTMLAttributes } from "react";
import type { MealType } from "@/lib/ai/schema";

export type TagVariant = "accent" | "accent-2" | "neutral" | "outline";

const VARIANT_CLASS: Record<TagVariant, string> = {
  accent: "tag-accent",
  "accent-2": "tag-accent-2",
  neutral: "tag-neutral",
  outline: "tag-outline",
};

const MEAL_TAG_CLASS: Record<MealType, string> = {
  breakfast: "tag-breakfast",
  lunch: "tag-lunch",
  dinner: "tag-dinner",
  snack: "tag-snack",
  dessert: "tag-dessert",
};

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: TagVariant;
  mealType?: MealType;
};

// mealType wins when both are given — a meal tag is never also styled as a
// generic accent/neutral tag.
export function Tag({ variant = "neutral", mealType, className, ...props }: TagProps) {
  const variantClass = mealType ? MEAL_TAG_CLASS[mealType] : VARIANT_CLASS[variant];
  return (
    <span className={["tag", variantClass, className].filter(Boolean).join(" ")} {...props} />
  );
}

type MealTagProps = Omit<TagProps, "mealType" | "variant"> & { mealType: MealType };

export function MealTag({ mealType, ...props }: MealTagProps) {
  return <Tag mealType={mealType} {...props} />;
}
