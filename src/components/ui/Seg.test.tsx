import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Seg } from "./Seg";

const OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

describe("Seg", () => {
  it("renders one real radio input per option, grouped by name", () => {
    render(<Seg name="effort" value="easy" options={OPTIONS} onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    for (const radio of radios) {
      expect(radio).toHaveAttribute("name", "effort");
    }
  });

  it("checks only the option matching value", () => {
    render(<Seg name="effort" value="medium" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Easy" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Medium" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Hard" })).not.toBeChecked();
  });

  it("calls onChange with the clicked option's value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Seg name="effort" value="easy" options={OPTIONS} onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "Hard" }));
    expect(onChange).toHaveBeenCalledWith("hard");
  });

  it("is keyboard operable as a real radiogroup (arrow keys move selection)", async () => {
    function Controlled() {
      const [value, setValue] = useState<(typeof OPTIONS)[number]["value"]>("easy");
      return <Seg name="effort" value={value} options={OPTIONS} onChange={setValue} />;
    }
    const user = userEvent.setup();
    render(<Controlled />);
    screen.getByRole("radio", { name: "Easy" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Medium" })).toBeChecked();
  });
});
