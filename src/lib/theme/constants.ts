// Shared between the blocking inline script in layout.tsx (reads before
// paint, avoiding a flash of the wrong theme) and ThemeToggle.tsx (writes
// on click) — one source of truth for the storage key and the value union,
// so the two never drift out of sync on what a stored value means.
export const THEME_STORAGE_KEY = "pantrypal-theme";

export const THEME_VALUES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_VALUES)[number];

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_VALUES as readonly string[]).includes(value);
}

// "system" is never written to the DOM as data-theme — its whole point is
// to let globals.css's prefers-color-scheme media query keep governing,
// which only happens when data-theme is ABSENT. Only "light"/"dark" ever
// become an explicit override.
export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

export function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    // Privacy mode / storage disabled — fall back to system, same as a
    // first-time visitor with nothing stored yet.
    return "system";
  }
}

// The native `storage` event only fires in OTHER tabs/windows than the one
// that called localStorage.setItem — never the tab that made the change.
// ThemeToggle reads state via useSyncExternalStore subscribed to both this
// and the native event, so a same-tab click still triggers a re-render.
const LOCAL_CHANGE_EVENT = "pantrypal-theme-change";

export function storeTheme(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Nothing to do if storage is unavailable — the in-memory DOM state
    // this tick is still correct, it just won't survive a reload.
  }
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
}

export function subscribeToThemeChanges(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_CHANGE_EVENT, callback);
  };
}

// Inlined as a raw string (not imported) into a <script> tag in layout.tsx
// — it has to run synchronously before first paint, which means it can't
// be a module import waiting on hydration. Deliberately reimplements the
// read+apply logic above in plain JS rather than sharing code, since
// nothing in this string can depend on anything outside itself.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
