type LogoProps = {
  size?: number;
  className?: string;
  /** Pass when there's no adjacent "PantryPal" wordmark (e.g. icon.tsx) —
   * gives the mark an accessible name instead of hiding it from AT. */
  title?: string;
};

// The "bowl & sprout" mark (design canvas 4b) — the one every shell
// artboard actually draws (1a, 2a, 5a, 6a, 7a, 7c, 7d all use this exact
// SVG), despite turn 4 presenting four candidates. Colors are token-driven
// via inline style rather than hardcoded hex, so the mark themes correctly
// in dark mode: back leaf -> --color-accent-2, front leaf ->
// --color-accent-2-400, bowl -> --color-accent (this SVG's own hex values
// are in fact where those exact token values came from).
export function Logo({ size = 27, className, title }: LogoProps) {
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
      <path
        d="M24 22c0-7 4-11 12-12 1 7-4 12-10 12"
        style={{ fill: "var(--color-accent-2)" }}
      />
      <path
        d="M24 22c0-5-3-8-8-9-1 5 3 9 7 9"
        style={{ fill: "var(--color-accent-2-400)" }}
      />
      <path
        d="M8 25h32a16 16 0 01-16 15A16 16 0 018 25z"
        style={{ fill: "var(--color-accent)" }}
      />
    </svg>
  );
}
