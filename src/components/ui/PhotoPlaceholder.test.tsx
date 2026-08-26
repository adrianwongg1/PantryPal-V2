import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhotoPlaceholder } from "./PhotoPlaceholder";

describe("PhotoPlaceholder", () => {
  it("shows the 'Photo' label by default", () => {
    render(<PhotoPlaceholder recipeId="r1" mealType="dinner" />);
    expect(screen.getByText("Photo")).toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<PhotoPlaceholder recipeId="r1" mealType="dinner" label="Photo — full bleed" />);
    expect(screen.getByText("Photo — full bleed")).toBeInTheDocument();
  });

  it("tints from the given meal type's own token pair", () => {
    const { container } = render(<PhotoPlaceholder recipeId="r1" mealType="breakfast" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.background).toBe("var(--color-breakfast-100)");
  });

  it("is deterministic: the same recipe id renders the same pattern every time", () => {
    const a = render(<PhotoPlaceholder recipeId="same-id" mealType="dinner" />);
    const b = render(<PhotoPlaceholder recipeId="same-id" mealType="dinner" />);
    const circlesOf = (root: HTMLElement) =>
      Array.from(root.querySelectorAll("circle")).map((c) => c.outerHTML);
    expect(circlesOf(a.container)).toEqual(circlesOf(b.container));
  });

  it("renders a different pattern for a different recipe id", () => {
    const a = render(<PhotoPlaceholder recipeId="recipe-a" mealType="dinner" />);
    const b = render(<PhotoPlaceholder recipeId="recipe-b" mealType="dinner" />);
    const circlesOf = (root: HTMLElement) =>
      Array.from(root.querySelectorAll("circle")).map((c) => c.outerHTML);
    expect(circlesOf(a.container)).not.toEqual(circlesOf(b.container));
  });

  it("never throws on an empty recipe id (falls back to hashing the meal type)", () => {
    expect(() => render(<PhotoPlaceholder recipeId="" mealType="snack" />)).not.toThrow();
  });
});
