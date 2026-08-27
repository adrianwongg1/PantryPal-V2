"use client";

import { useSyncExternalStore } from "react";
import {
  applyTheme,
  readStoredTheme,
  storeTheme,
  subscribeToThemeChanges,
  THEME_VALUES,
  type ThemePreference,
} from "@/lib/theme/constants";
import { MoonIcon, SunIcon, SystemIcon } from "@/components/ui/icons";

const ICON: Record<ThemePreference, typeof SunIcon> = {
  system: SystemIcon,
  light: SunIcon,
  dark: MoonIcon,
};

const LABEL: Record<ThemePreference, string> = {
  system: "Matching your system",
  light: "Light",
  dark: "Dark",
};

function next(preference: ThemePreference): ThemePreference {
  const i = THEME_VALUES.indexOf(preference);
  return THEME_VALUES[(i + 1) % THEME_VALUES.length];
}

// "system" — the same value the server would've rendered, since there's no
// localStorage to read there. Matches the inline init script in layout.tsx,
// which also does nothing when nothing is stored.
function getServerSnapshot(): ThemePreference {
  return "system";
}

// A compact stand-in for 6c's full Theme row (Phase 7, not built yet) —
// same underlying mechanism (lib/theme/constants.ts), just a single icon
// button that cycles system -> light -> dark -> system, since there's
// nowhere else to put a theme control until Settings exists. 6c's row will
// call applyTheme/storeTheme directly rather than duplicating this cycle.
//
// Reads via useSyncExternalStore rather than useState+useEffect: this is
// external state (localStorage, plus the OS-level scheme the "system"
// value defers to), which is exactly what the hook exists for, and it
// avoids the extra render pass a "read on mount" effect would cause.
export function ThemeToggle({ className }: { className?: string }) {
  const preference = useSyncExternalStore(
    subscribeToThemeChanges,
    readStoredTheme,
    getServerSnapshot,
  );
  const Icon = ICON[preference];

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const value = next(preference);
        storeTheme(value);
        applyTheme(value);
      }}
      aria-label={`Theme: ${LABEL[preference]}. Click to change.`}
      title={`Theme: ${LABEL[preference]}`}
    >
      <Icon />
    </button>
  );
}
