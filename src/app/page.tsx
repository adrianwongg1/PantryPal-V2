import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";
import { MealTag } from "@/components/ui/Tag";
import { buttonClassName } from "@/components/ui/Button";

// Built from 3a's left panel (headline, copy, meal tags) — the canvas
// never draws a dedicated landing page, only the warm panel beside the
// login form. An already-authenticated visitor is sent straight into the
// app rather than shown marketing copy for a product they're already
// signed into.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/recipes");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-bg px-6 py-24 text-ink">
      <Logo size={40} title="PantryPal" />

      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <span className="text-[11px] font-heading uppercase tracking-[0.1em] text-accent-700">
          PantryPal
        </span>
        <h1 className="text-4xl">Cook what you already have.</h1>
        <p className="max-w-md text-base text-[color:var(--color-muted)]">
          Tell PantryPal what&rsquo;s in your kitchen and it turns that into a cookable
          recipe in seconds &mdash; with dietary preferences, a saved pantry, and share
          links that actually work for anyone with the link.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <MealTag mealType="breakfast">Breakfast</MealTag>
        <MealTag mealType="lunch">Lunch</MealTag>
        <MealTag mealType="dinner">Dinner</MealTag>
        <MealTag mealType="snack">Snack</MealTag>
        <MealTag mealType="dessert">Dessert</MealTag>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/signup" className={buttonClassName({ variant: "primary" })}>
          Get started
        </Link>
        <Link href="/login" className={buttonClassName({ variant: "secondary" })}>
          Log in
        </Link>
      </div>
    </div>
  );
}
