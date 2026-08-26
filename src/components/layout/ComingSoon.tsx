// Shared shell for the four nav destinations that don't have a real page
// yet (Generate/This week/Pantry/Preferences — Phases 5 and 7). Exists so
// AppShell's nav can be the real, final five-item nav from day one instead
// of a subset that grows link-by-link, and so nothing 404s. Each of these
// pages is deleted outright and replaced by its phase's real
// implementation, not extended in place.
export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="text-[11px] font-heading uppercase tracking-[0.1em] text-accent-700">
        {phase}
      </span>
      <h1 className="text-3xl">{title}</h1>
      <p className="max-w-sm text-sm text-[color:var(--color-muted)]">{description}</p>
    </div>
  );
}
