import { describe, expect, it } from "vitest";
import { generateShareSlug, isValidShareSlug } from "./slug";

describe("generateShareSlug", () => {
  it("matches the DB check constraint: ^[a-z0-9-]{8,120}$", () => {
    for (let i = 0; i < 200; i++) {
      const slug = generateShareSlug();
      expect(slug).toMatch(/^[a-z0-9-]{8,120}$/);
    }
  });

  it("is 20 characters long", () => {
    expect(generateShareSlug()).toHaveLength(20);
  });

  it("contains no uppercase letters or hyphens (pure hex, lowercased)", () => {
    const slug = generateShareSlug();
    expect(slug).toMatch(/^[a-f0-9]+$/);
  });

  it("is different on every call", () => {
    const slugs = new Set(Array.from({ length: 500 }, () => generateShareSlug()));
    expect(slugs.size).toBe(500);
  });
});

describe("isValidShareSlug", () => {
  it("accepts a generated slug", () => {
    expect(isValidShareSlug(generateShareSlug())).toBe(true);
  });

  it("accepts the shortest and longest valid lengths", () => {
    expect(isValidShareSlug("a".repeat(8))).toBe(true);
    expect(isValidShareSlug("a".repeat(120))).toBe(true);
  });

  it("rejects too short, too long, uppercase, or invalid characters", () => {
    expect(isValidShareSlug("a".repeat(7))).toBe(false);
    expect(isValidShareSlug("a".repeat(121))).toBe(false);
    expect(isValidShareSlug("ABCDEFGH")).toBe(false);
    expect(isValidShareSlug("has spaces here")).toBe(false);
    expect(isValidShareSlug("has_underscore1")).toBe(false);
    expect(isValidShareSlug("")).toBe(false);
  });
});
