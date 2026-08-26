import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  readStoredTheme,
  storeTheme,
  subscribeToThemeChanges,
  THEME_STORAGE_KEY,
} from "./constants";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("readStoredTheme", () => {
  it("defaults to 'system' when nothing is stored", () => {
    expect(readStoredTheme()).toBe("system");
  });

  it("reads back a stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("falls back to 'system' for a garbage stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "not-a-real-theme");
    expect(readStoredTheme()).toBe("system");
  });
});

describe("storeTheme", () => {
  it("persists light/dark to localStorage", () => {
    storeTheme("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("removes the key entirely for 'system' rather than storing the literal string", () => {
    storeTheme("dark");
    storeTheme("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});

describe("applyTheme", () => {
  it("sets data-theme for light/dark", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("removes data-theme entirely for 'system', so the CSS media query governs", () => {
    applyTheme("dark");
    applyTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});

describe("subscribeToThemeChanges", () => {
  it("notifies subscribers when storeTheme is called in the same tab", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToThemeChanges(callback);
    storeTheme("dark");
    expect(callback).toHaveBeenCalled();
    unsubscribe();
  });

  it("notifies subscribers on a native 'storage' event (cross-tab change)", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToThemeChanges(callback);
    window.dispatchEvent(new Event("storage"));
    expect(callback).toHaveBeenCalled();
    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToThemeChanges(callback);
    unsubscribe();
    storeTheme("dark");
    expect(callback).not.toHaveBeenCalled();
  });
});
