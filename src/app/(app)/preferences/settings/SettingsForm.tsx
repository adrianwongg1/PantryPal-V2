"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { Seg } from "@/components/ui/Seg";
import { RadioGroup } from "@/components/ui/Radio";
import { Button } from "@/components/ui/Button";
import {
  applyTheme,
  readStoredTheme,
  storeTheme,
  subscribeToThemeChanges,
  THEME_VALUES,
  type ThemePreference,
} from "@/lib/theme/constants";
import type { Visibility } from "@/lib/recipes/edit-schema";
import { updateSettingsAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = { error: null };

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "Matching your system",
  light: "Light",
  dark: "Dark",
};

const UNITS_OPTIONS = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
] as const;

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "private", label: "Private — only you" },
  { value: "unlisted", label: "Unlisted — anyone with the link" },
  { value: "public", label: "Public — listed and linkable" },
];

function getServerSnapshot(): ThemePreference {
  return "system";
}

export function SettingsForm({
  initialUnits,
  initialNotifyExpiring,
  initialNotifyWeeklyPlan,
  initialDefaultVisibility,
}: {
  initialUnits: "metric" | "imperial";
  initialNotifyExpiring: boolean;
  initialNotifyWeeklyPlan: boolean;
  initialDefaultVisibility: Visibility;
}) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initialState);

  // Reads/writes the exact same mechanism ThemeToggle uses (lib/theme/
  // constants.ts) rather than a parallel theme state of its own — applying
  // and storing happen immediately on click, same as the header toggle;
  // this row is a richer System/Light/Dark picker over that one control,
  // not a second source of truth. The choice is also submitted with the
  // rest of this form so it's recorded in user_preferences.theme, but
  // nothing in the app reads that column back to decide what to render —
  // doing so would risk a flash-of-wrong-theme the no-flash inline script
  // in layout.tsx exists specifically to avoid.
  const theme = useSyncExternalStore(subscribeToThemeChanges, readStoredTheme, getServerSnapshot);

  const [units, setUnits] = useState(initialUnits);
  const [notifyExpiring, setNotifyExpiring] = useState(initialNotifyExpiring);
  const [notifyWeeklyPlan, setNotifyWeeklyPlan] = useState(initialNotifyWeeklyPlan);
  const [visibility, setVisibility] = useState<Visibility>(initialDefaultVisibility);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div>
        <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Theme</div>
        <input type="hidden" name="theme" value={theme} />
        <Seg
          name="theme-display"
          value={theme}
          onChange={(value) => {
            storeTheme(value);
            applyTheme(value);
          }}
          options={THEME_VALUES.map((t) => ({ value: t, label: THEME_LABELS[t] }))}
        />
      </div>

      <div>
        <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">Units</div>
        <input type="hidden" name="units" value={units} />
        <Seg name="units-display" value={units} onChange={setUnits} options={UNITS_OPTIONS} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-xs text-[color:var(--color-muted)]">
          Nudges — saved for when delivery exists; nothing sends yet
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notifyExpiring"
            checked={notifyExpiring}
            onChange={(e) => setNotifyExpiring(e.target.checked)}
          />
          Tell me when something&rsquo;s about to expire
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notifyWeeklyPlan"
            checked={notifyWeeklyPlan}
            onChange={(e) => setNotifyWeeklyPlan(e.target.checked)}
          />
          Remind me to plan the week
        </label>
      </div>

      <div>
        <div className="mb-1.5 text-xs text-[color:var(--color-muted)]">
          New recipes are shared as
        </div>
        <input type="hidden" name="defaultVisibility" value={visibility} />
        <RadioGroup
          name="defaultVisibility-display"
          value={visibility}
          onChange={setVisibility}
          options={VISIBILITY_OPTIONS}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-snack-800">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
