type LogoProps = {
  size?: number;
  className?: string;
  /** Pass when there's no adjacent "PantryPal" wordmark (e.g. icon.tsx) —
   * gives the mark an accessible name instead of hiding it from AT. */
  title?: string;
  /**
   * Literal hex overrides for the three fills, keyed the same as the
   * default var()s below. Exists for one caller only: app/icon.tsx renders
   * through Satori (next/og's ImageResponse), which has no stylesheet
   * cascade and can't resolve CSS custom properties — var(--color-accent)
   * would render as nothing there. Everywhere else, omit this and get the
   * token-driven (and therefore theme-correct) default.
   */
  colors?: { backLeaf: string; frontLeaf: string; bowl: string };
};

const DEFAULT_COLORS = {
  backLeaf: "var(--color-accent-2)",
  frontLeaf: "var(--color-accent-2-400)",
  bowl: "var(--color-accent)",
};

// The "bowl & sprout" mark (design canvas 4b) — the one every shell
// artboard actually draws (1a, 2a, 5a, 6a, 7a, 7c, 7d all use this exact
// SVG), despite turn 4 presenting four candidates. Colors are token-driven
// via inline style by default, so the mark themes correctly in dark mode
// (this SVG's own hex values are in fact where --color-accent-2,
// --color-accent-2-400 and --color-accent came from in the first place).
export function Logo({ size = 27, className, title, colors }: LogoProps) {
  const { backLeaf, frontLeaf, bowl } = colors ?? DEFAULT_COLORS;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path d="M24 22c0-7 4-11 12-12 1 7-4 12-10 12" style={{ fill: backLeaf }} />
      <path d="M24 22c0-5-3-8-8-9-1 5 3 9 7 9" style={{ fill: frontLeaf }} />
      <path
        d="M8 25h32a16 16 0 01-16 15A16 16 0 018 25z"
        style={{ fill: bowl }}
      />
    </svg>
  );
}
