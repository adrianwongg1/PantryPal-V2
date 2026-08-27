import { describe, expect, it } from "vitest";
import { isUseSoon, isPantryCategory } from "./categories";

const TODAY = new Date("2026-08-26T12:00:00");

describe("isUseSoon", () => {
  it("is false when there's no expiry date at all", () => {
    expect(isUseSoon(null, TODAY)).toBe(false);
  });

  it("is false for something well in the future", () => {
    expect(isUseSoon("2026-09-15", TODAY)).toBe(false);
  });

  it("is true for something expiring today", () => {
    expect(isUseSoon("2026-08-26", TODAY)).toBe(true);
  });

  it("is true within the 3-day window", () => {
    expect(isUseSoon("2026-08-28", TODAY)).toBe(true);
  });

  it("is false just outside the 3-day window", () => {
    expect(isUseSoon("2026-08-30", TODAY)).toBe(false);
  });

  it("is true for something already expired", () => {
    expect(isUseSoon("2026-08-20", TODAY)).toBe(true);
  });
});

describe("isPantryCategory", () => {
  it("accepts every canonical category", () => {
    expect(isPantryCategory("fridge")).toBe(true);
    expect(isPantryCategory("freezer")).toBe(true);
    expect(isPantryCategory("cupboard")).toBe(true);
    expect(isPantryCategory("fresh")).toBe(true);
  });

  it("rejects null and anything else", () => {
    expect(isPantryCategory(null)).toBe(false);
    expect(isPantryCategory("pantry")).toBe(false);
    expect(isPantryCategory("")).toBe(false);
  });
});
