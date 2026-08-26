import type { SVGProps } from "react";

// Nav and chrome icons, at Organic's own spec (stroke-width 2.75, round
// caps/joins, 24x24 viewBox) — the design canvas's own icon usage
// throughout the shell (readme.md: "Use Lucide icons, at stroke-width 2.75
// for a rounder, heavier look"). stroke="currentColor" so each icon
// inherits its context's text color rather than carrying its own.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function iconProps({ size = 17, ...props }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function GenerateIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    </svg>
  );
}

export function RecipesIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2z" />
      <path d="M9 3v18" />
    </svg>
  );
}

export function WeekIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function PantryIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function PreferencesIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 17h6" />
      <path d="M14 17h6" />
      <circle cx="12" cy="17" r="2" />
    </svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 21H6a2 2 0 01-2-2V5a2 2 0 012-2h3" />
      <path d="M16 16l5-4-5-4" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
    </svg>
  );
}

export function SystemIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
