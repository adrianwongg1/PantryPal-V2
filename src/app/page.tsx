import Link from "next/link";

// Phase 0/1 placeholder, kept through the Organic token port (Phase 2) so it
// still proves the port renders correctly — real bg/surface/ink/accent, the
// five-category meal-type scale, and the ported .btn/.tag component classes.
// Replaced by the real landing page in Phase 4.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-bg px-6 py-24 text-ink">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <span className="text-[11px] font-heading uppercase tracking-[0.1em] text-accent-700">
          PantryPal
        </span>
        <h1 className="text-4xl">What&rsquo;s in your kitchen?</h1>
        <p className="text-base max-w-md text-[color:var(--color-muted)]">
          Tell PantryPal what you have on hand and it turns it into a
          cookable recipe in seconds &mdash; built, hosted, and free to run.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="tag tag-breakfast">Breakfast</span>
        <span className="tag tag-lunch">Lunch</span>
        <span className="tag tag-dinner">Dinner</span>
        <span className="tag tag-snack">Snack</span>
        <span className="tag tag-dessert">Dessert</span>
      </div>

      <button type="button" disabled className="btn btn-primary">
        Generate a recipe (coming soon)
      </button>

      <div className="flex items-center gap-4 text-sm">
        <Link href="/login" className="text-accent-700 underline">
          Log in
        </Link>
        <Link href="/signup" className="text-accent-700 underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
