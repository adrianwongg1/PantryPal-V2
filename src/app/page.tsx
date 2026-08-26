import Link from "next/link";

// Phase 0 placeholder. Proves the Modernist token port renders correctly
// (bg/surface/ink/accent + the heritage meal-type scale) before any real
// feature is built. Replaced by the real landing page in a later phase.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-bg px-6 py-24 text-ink">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <span className="text-[11px] font-heading font-extrabold uppercase tracking-[0.1em] text-accent">
          PantryPal
        </span>
        <h1 className="text-4xl">What&rsquo;s in your kitchen?</h1>
        <p className="text-base max-w-md text-[color:var(--color-muted)]">
          Tell PantryPal what you have on hand and it turns it into a
          cookable recipe in seconds &mdash; built, hosted, and free to run.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center px-2.5 py-1 text-[11px] tracking-wide bg-breakfast-100 text-breakfast-800">
          Breakfast
        </span>
        <span className="inline-flex items-center px-2.5 py-1 text-[11px] tracking-wide bg-lunch-100 text-lunch-800">
          Lunch
        </span>
        <span className="inline-flex items-center px-2.5 py-1 text-[11px] tracking-wide bg-dinner-100 text-dinner-800">
          Dinner
        </span>
      </div>

      <button
        type="button"
        disabled
        className="font-heading font-extrabold text-sm bg-accent text-bg px-5 py-2.5 disabled:opacity-45"
      >
        Generate a recipe (coming soon)
      </button>

      <div className="flex items-center gap-4 text-sm">
        <Link href="/login" className="text-accent underline">
          Log in
        </Link>
        <Link href="/signup" className="text-accent underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
