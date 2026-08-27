import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders as decorative (aria-hidden) when no title is given", () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("renders as an accessible image when a title is given", () => {
    const { container } = render(<Logo title="PantryPal" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "PantryPal");
    expect(svg?.querySelector("title")?.textContent).toBe("PantryPal");
  });

  it("respects the size prop", () => {
    const { container } = render(<Logo size={48} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "48");
    expect(svg).toHaveAttribute("height", "48");
  });

  it("renders exactly three paths, tinted from tokens rather than hardcoded hex", () => {
    const { container } = render(<Logo />);
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(3);
    for (const path of paths) {
      expect(path.getAttribute("style") ?? "").toMatch(/var\(--color-accent/);
    }
  });
});
