import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChipToggle } from "./ChipToggle";

describe("ChipToggle", () => {
  it("renders a real checkbox with the given name/value", () => {
    render(
      <ChipToggle name="diets" value="vegan">
        Vegan
      </ChipToggle>,
    );
    const box = screen.getByRole("checkbox", { name: "Vegan" });
    expect(box).toHaveAttribute("name", "diets");
    expect(box).toHaveAttribute("value", "vegan");
  });

  it("respects defaultChecked", () => {
    render(
      <ChipToggle name="diets" value="vegan" defaultChecked>
        Vegan
      </ChipToggle>,
    );
    expect(screen.getByRole("checkbox", { name: "Vegan" })).toBeChecked();
  });

  it("toggles on click, same as clicking any checkbox label", async () => {
    const user = userEvent.setup();
    render(
      <ChipToggle name="diets" value="vegan">
        Vegan
      </ChipToggle>,
    );
    const box = screen.getByRole("checkbox", { name: "Vegan" });
    expect(box).not.toBeChecked();
    await user.click(screen.getByText("Vegan"));
    expect(box).toBeChecked();
  });

  it("is reachable and operable by keyboard", async () => {
    const user = userEvent.setup();
    render(
      <ChipToggle name="diets" value="vegan">
        Vegan
      </ChipToggle>,
    );
    await user.tab();
    expect(screen.getByRole("checkbox", { name: "Vegan" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("checkbox", { name: "Vegan" })).toBeChecked();
  });
});
